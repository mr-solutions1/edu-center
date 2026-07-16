import React from 'react';

import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';

const FormDialog = ({
  title,
  description,
  trigger,
  children,
  open,
  onOpenChange,
  onSave,
  saveText = 'حفظ',
  cancelText = 'إلغاء',
  isSubmitting = false,
  formId,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className="w-full h-full max-h-screen sm:h-auto sm:max-h-[90vh] sm:max-w-[480px] rounded-none sm:rounded-3xl border-none shadow-2xl p-0 flex flex-col overflow-hidden"
        dir="rtl"
      >
        {/* Dynamic top bar decoration */}
        <div className="h-2 bg-secondary w-full shrink-0" />

        {/* Sticky dialog header */}
        <DialogHeader className="p-6 pb-2 border-b border-slate-100 sm:border-none shrink-0">
          <DialogTitle className="text-right text-xl sm:text-2xl font-black text-primary tracking-tight">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-right font-medium text-muted-foreground text-xs sm:text-sm mt-1">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Scrollable body content to prevent viewport cutoffs on small mobiles */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {children}
        </div>

        {/* Sticky footer with premium tap targets */}
        <DialogFooter className="p-4 sm:p-6 border-t border-slate-100 bg-gray-50 flex flex-row-reverse items-center justify-end gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-initial h-11 sm:h-10 rounded-xl font-bold text-xs"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {cancelText}
          </Button>
          <Button
            type={formId ? 'submit' : 'button'}
            form={formId}
            onClick={onSave}
            className="flex-1 sm:flex-initial h-11 sm:h-10 rounded-xl font-bold text-xs bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'جاري الحفظ...' : saveText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FormDialog;
