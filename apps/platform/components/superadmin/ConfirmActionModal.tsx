import * as Dialog from '@radix-ui/react-dialog';
import React from 'react';
import saStyles from '../../styles/superadmin.module.css';

interface ConfirmActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  isLoading?: boolean;
  tone?: 'default' | 'danger';
  requiredText?: string;
  typedValue?: string;
  onTypedValueChange?: (value: string) => void;
  reasonLabel?: string;
  reasonValue?: string;
  onReasonChange?: (value: string) => void;
  reasonPlaceholder?: string;
}

export default function ConfirmActionModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  isLoading = false,
  tone = 'default',
  requiredText,
  typedValue = '',
  onTypedValueChange,
  reasonLabel,
  reasonValue = '',
  onReasonChange,
  reasonPlaceholder,
}: ConfirmActionModalProps) {
  const requiresKeyword = Boolean(requiredText);
  const requiresReason = Boolean(reasonLabel);
  const keywordMatches = !requiresKeyword || typedValue.trim() === requiredText;
  const hasReason = !requiresReason || reasonValue.trim().length > 0;
  const canSubmit = !isLoading && keywordMatches && hasReason;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={saStyles.modalOverlay} />
        <Dialog.Content className={saStyles.modalContent}>
          <div className={saStyles.modalHeader}>
            <Dialog.Title className={saStyles.modalTitle}>{title}</Dialog.Title>
            <Dialog.Description className={saStyles.modalDescription}>
              {description}
            </Dialog.Description>
          </div>

          <div className={saStyles.modalForm}>
            {requiresKeyword && (
              <label className={saStyles.modalField}>
                <span className={saStyles.modalLabel}>
                  Escribe <strong>{requiredText}</strong> para continuar
                </span>
                <input
                  value={typedValue}
                  onChange={(event) => onTypedValueChange?.(event.target.value)}
                  placeholder={requiredText}
                  className={saStyles.modalInput}
                />
              </label>
            )}

            {requiresReason && (
              <label className={saStyles.modalField}>
                <span className={saStyles.modalLabel}>{reasonLabel}</span>
                <textarea
                  value={reasonValue}
                  onChange={(event) => onReasonChange?.(event.target.value)}
                  placeholder={reasonPlaceholder}
                  rows={4}
                  className={`${saStyles.modalInput} ${saStyles.modalTextarea}`}
                />
              </label>
            )}
          </div>

          <div className={saStyles.modalActions}>
            <Dialog.Close asChild>
              <button type="button" className={saStyles.secondaryAction} disabled={isLoading}>
                Cancelar
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!canSubmit}
              className={tone === 'danger' ? saStyles.dangerAction : saStyles.primaryAction}
            >
              {isLoading ? 'Guardando...' : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
