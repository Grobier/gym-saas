import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { admin } from 'firebase-admin';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private supabase = createClient(
    this.configService.getOrThrow('NEXT_PUBLIC_SUPABASE_URL'),
    this.configService.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
  );

  constructor(private configService: ConfigService) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    if (!admin.apps.length) {
      const firebaseConfig = {
        projectId: this.configService.get('FIREBASE_PROJECT_ID'),
        privateKey: this.configService.get('FIREBASE_PRIVATE_KEY'),
        clientEmail: this.configService.get('FIREBASE_CLIENT_EMAIL'),
      };

      admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig as any),
      });
    }
  }

  /**
   * Send push notification to single user
   */
  async sendToUser(
    userId: string,
    gymId: string,
    payload: NotificationPayload,
  ): Promise<void> {
    try {
      const { data: tokens } = await this.supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', userId)
        .eq('gym_id', gymId)
        .eq('is_active', true);

      if (!tokens || tokens.length === 0) {
        this.logger.debug(`No push tokens for user ${userId}`);
        return;
      }

      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        tokens: tokens.map((t) => t.token),
      };

      const response = await admin.messaging().sendMulticast(message as any);

      this.logger.log(
        `Sent notifications: ${response.successCount} succeeded, ${response.failureCount} failed`
      );

      // Update failed tokens
      if (response.failureCount > 0) {
        const failedIndices = response.responses
          .map((r, i) => (r.success ? null : i))
          .filter((i) => i !== null);

        for (const idx of failedIndices) {
          await this.supabase
            .from('push_tokens')
            .update({ is_active: false })
            .eq('token', tokens[idx].token);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Send to multiple users (bulk)
   */
  async sendToUsers(
    userIds: string[],
    gymId: string,
    payload: NotificationPayload,
  ): Promise<void> {
    for (const userId of userIds) {
      await this.sendToUser(userId, gymId, payload);
    }
  }

  /**
   * Send to all members of gym
   */
  async sendToGym(
    gymId: string,
    payload: NotificationPayload,
  ): Promise<void> {
    try {
      const { data: users } = await this.supabase
        .from('gym_access')
        .select('user_id')
        .eq('gym_id', gymId);

      if (!users) return;

      const userIds = users.map((u) => u.user_id);
      await this.sendToUsers(userIds, gymId, payload);
    } catch (error) {
      this.logger.error(`Failed to send gym notification: ${error.message}`);
    }
  }

  /**
   * Cron: Send class reminders 24h before
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendClassReminders(): Promise<void> {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(23, 59, 59, 999);

      // Find all classes tomorrow
      const { data: classes } = await this.supabase
        .from('classes')
        .select(
          `
          id,
          name,
          starts_at,
          gym_id,
          reservations!inner(student_id)
        `
        )
        .gte('starts_at', tomorrow.toISOString())
        .lte('starts_at', tomorrowEnd.toISOString());

      if (!classes) return;

      // Send reminders to reserved students
      for (const classItem of classes) {
        const studentIds = classItem.reservations.map((r) => r.student_id);
        const classTime = new Date(classItem.starts_at).toLocaleTimeString(
          'es-CL',
          { hour: '2-digit', minute: '2-digit' }
        );

        await this.sendToUsers(studentIds, classItem.gym_id, {
          title: 'Class Reminder',
          body: `${classItem.name} tomorrow at ${classTime}`,
          data: {
            classId: classItem.id,
            type: 'class_reminder',
          },
        });
      }

      this.logger.log(`Sent ${classes.length} class reminders`);
    } catch (error) {
      this.logger.error(`Failed to send class reminders: ${error.message}`);
    }
  }

  /**
   * Cron: Send payment reminders for pending transfers
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async sendPaymentReminders(): Promise<void> {
    try {
      // Find pending transfer payments older than 24h
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: payments } = await this.supabase
        .from('payments')
        .select('id, student_id, gym_id, amount')
        .eq('status', 'pending_validation')
        .lt('created_at', yesterday.toISOString());

      if (!payments) return;

      // Get student user IDs
      for (const payment of payments) {
        const { data: student } = await this.supabase
          .from('students')
          .select('user_id')
          .eq('id', payment.student_id)
          .single();

        if (!student) continue;

        await this.sendToUser(student.user_id, payment.gym_id, {
          title: 'Payment Pending',
          body: `Your transfer proof for $${payment.amount} is being reviewed`,
          data: {
            paymentId: payment.id,
            type: 'payment_reminder',
          },
        });
      }

      this.logger.log(`Sent ${payments.length} payment reminders`);
    } catch (error) {
      this.logger.error(`Failed to send payment reminders: ${error.message}`);
    }
  }

  /**
   * Cron: Send expiry warnings for memberships
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendExpiryWarnings(): Promise<void> {
    try {
      // Find memberships expiring in 7 days
      const today = new Date();
      const inSevenDays = new Date(today);
      inSevenDays.setDate(inSevenDays.getDate() + 7);

      const { data: memberships } = await this.supabase
        .from('memberships')
        .select(`
          id,
          student_id,
          gym_id,
          plans(name),
          expires_at
        `)
        .eq('status', 'active')
        .gte('expires_at', today.toISOString())
        .lte('expires_at', inSevenDays.toISOString());

      if (!memberships) return;

      for (const membership of memberships) {
        const { data: student } = await this.supabase
          .from('students')
          .select('user_id')
          .eq('id', membership.student_id)
          .single();

        if (!student) continue;

        const daysLeft = Math.ceil(
          (new Date(membership.expires_at).getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        await this.sendToUser(student.user_id, membership.gym_id, {
          title: 'Membership Expiring',
          body: `Your ${membership.plans.name} expires in ${daysLeft} days`,
          data: {
            membershipId: membership.id,
            type: 'expiry_warning',
          },
        });
      }

      this.logger.log(`Sent ${memberships.length} expiry warnings`);
    } catch (error) {
      this.logger.error(`Failed to send expiry warnings: ${error.message}`);
    }
  }

  /**
   * Register push token for user
   */
  async registerToken(
    userId: string,
    gymId: string,
    token: string,
  ): Promise<void> {
    try {
      await this.supabase.from('push_tokens').upsert(
        {
          user_id: userId,
          gym_id: gymId,
          token,
          is_active: true,
          updated_at: new Date(),
        },
        { onConflict: 'user_id,gym_id,token' }
      );
    } catch (error) {
      this.logger.error(`Failed to register token: ${error.message}`);
    }
  }

  /**
   * Unregister push token
   */
  async unregisterToken(token: string): Promise<void> {
    try {
      await this.supabase
        .from('push_tokens')
        .update({ is_active: false })
        .eq('token', token);
    } catch (error) {
      this.logger.error(`Failed to unregister token: ${error.message}`);
    }
  }
}
