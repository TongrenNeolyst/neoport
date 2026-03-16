import { Button } from "./button";
import { Modal } from "./modal";

export type ConfirmTone = "secondary" | "danger";

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmTone?: ConfirmTone;
  confirmLabel?: string;
  loading?: boolean;
};

export function ConfirmModal({
  open,
  title,
  description,
  onClose,
  onConfirm,
  confirmTone = "secondary",
  confirmLabel = "Confirm",
  loading,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={confirmTone === "danger" ? "danger" : "secondary"}
            type="button"
            onClick={onConfirm}
            isLoading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[var(--fg-secondary)]">Please confirm to proceed.</p>
    </Modal>
  );
}
