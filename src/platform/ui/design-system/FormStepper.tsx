import React, { useState } from 'react';
import { notify } from '@/src/shared/utils/notify';
import { useConfirm } from './Confirm';
import { Check, ChevronRight, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './Button';

export interface Step {
  id: string;
  label: string;
  description?: string;
  content: React.ReactNode;
  validate?: () => Promise<boolean> | boolean; // Async or sync validation
  canSkip?: boolean;
}

interface FormStepperProps {
  entityType: string;
  steps: Step[];
  onComplete: () => Promise<void>;
  onCancel: () => void;
  uid: string; // Used for draft collection
  defaultValues?: any; 
  onChange?: (values: any) => void; 
  isSaving?: boolean;
  lastSavedAt?: Date | null;
}

export function FormStepper({ 
  // eslint-disable-next-line unused-imports/no-unused-vars
  entityType, steps, onComplete, onCancel, uid, defaultValues, onChange, isSaving, lastSavedAt 
}: FormStepperProps) {
  const { confirm } = useConfirm();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isValidating, setIsValidating] = useState(false);

  const handleNext = async () => {
    const currentStep = steps[currentStepIndex];
    
    if (currentStep.validate) {
      setIsValidating(true);
      try {
        const isValid = await currentStep.validate();
        if (!isValid) {
          setIsValidating(false);
          return;
        }
      // eslint-disable-next-line unused-imports/no-unused-vars
      } catch (_e) {
        notify.error("Validation failed");
        setIsValidating(false);
        return;
      }
      setIsValidating(false);
    }
    
    // Mark as completed
    const newCompleted = new Set(completedSteps);
    newCompleted.add(currentStepIndex);
    setCompletedSteps(newCompleted);

    if (currentStepIndex === steps.length - 1) {
      await onComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    } else {
      onCancel();
    }
  };

  const isCurrentStepLast = currentStepIndex === steps.length - 1;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Desktop Stepper Visuals */}
      <div className="hidden md:flex items-center w-full px-12 py-10 bg-white border-b border-slate-200 shrink-0">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(index);
          const isCurrent = index === currentStepIndex;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center relative z-10 w-32">
                <Button variant="ghost" onClick={() => {
                    if (isCompleted || index < currentStepIndex) setCurrentStepIndex(index);
                  }}
                  disabled={!isCompleted && index > currentStepIndex}
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold text-sm transition-all shadow-sm ${
                    isCompleted && !isCurrent
                      ? 'bg-brand-accent border-brand-accent text-white'
                      : isCurrent
                      ? 'bg-slate-900 border-slate-900 text-white ring-4 ring-slate-100'
                      : 'bg-white border-slate-200 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {isCompleted && !isCurrent ? <Check size={16} /> : (index + 1)}
                </Button>
                <div className="absolute top-12 left-1/2 -translate-x-1/2 w-40 text-center mt-2">
                  <div className={`text-xs font-bold ${isCurrent ? 'text-slate-900' : 'text-slate-600'}`}>
                    {step.label}
                  </div>
                  {step.description && (
                    <div className="text-2xs text-slate-600 mt-0.5 line-clamp-1">{step.description}</div>
                  )}
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2 h-[2px] rounded bg-slate-100 relative -translate-y-[10px]">
                   <div 
                     className="absolute left-0 top-0 h-full bg-brand-accent transition-all duration-500 ease-out"
                     style={{ width: isCompleted || index < currentStepIndex ? '100%' : '0%' }}
                   />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile Timeline Stepper */}
      <div className="md:hidden flex flex-col bg-white border-b border-slate-200 p-6 shrink-0 relative overflow-hidden">
         <div className="absolute left-9 top-10 bottom-10 w-0.5 bg-slate-100 z-0 rounded-full" />
         <div className="flex flex-col gap-4 relative z-10 w-full pl-2">
           {steps.map((step, index) => {
             const isCompleted = completedSteps.has(index);
             const isCurrent = index === currentStepIndex;
             
             return (
               <div 
                 key={step.id} 
                 role="button"
                 tabIndex={isCompleted || index < currentStepIndex ? 0 : undefined}
                 className={`flex items-start gap-4 ${isCurrent || isCompleted ? 'opacity-100' : 'opacity-40 cursor-not-allowed'} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md p-1 -m-1`}
                 onClick={() => {
                   if (isCompleted || index < currentStepIndex) setCurrentStepIndex(index);
                 }}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter' || e.key === ' ') {
                     e.preventDefault();
                     if (isCompleted || index < currentStepIndex) setCurrentStepIndex(index);
                   }
                 }}
               >
                 <Button variant="ghost" disabled={!isCompleted && index > currentStepIndex}
                   className={`flex items-center justify-center shrink-0 w-6 h-6 rounded-full border-[1.5px] font-bold text-2xs transition-all shadow-sm ${
                     isCompleted && !isCurrent
                       ? 'bg-brand-accent border-brand-accent text-white'
                       : isCurrent
                       ? 'bg-slate-900 border-slate-900 text-white ring-2 ring-slate-100/50'
                       : 'bg-white border-slate-300 text-slate-500'
                   }`}
                 >
                   {isCompleted && !isCurrent ? <Check size={12} strokeWidth={3} /> : (index + 1)}
                 </Button>
                 <div className="flex flex-col -mt-0.5">
                   <div className={`text-sm font-bold ${isCurrent ? 'text-slate-900' : 'text-slate-700'}`}>
                     {step.label}
                   </div>
                   {step.description && isCurrent && (
                     <div className="text-xs text-slate-500 mt-1">{step.description}</div>
                   )}
                 </div>
               </div>
             );
           })}
         </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-10 hide-scrollbar relative">
         <AnimatePresence mode="wait">
            <motion.div
               key={currentStepIndex}
               initial={{ opacity: 0, scale: 0.98, y: 10 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.98, y: -10 }}
               transition={{ duration: 0.2 }}
               className="h-full"
            >
               {steps[currentStepIndex].content}
            </motion.div>
         </AnimatePresence>
      </div>

      {/* Footer Controls */}
      <div className="px-6 py-4 md:px-10 border-t border-slate-200 bg-white shrink-0 flex items-center justify-between">
         <div className="flex items-center gap-3">
            {lastSavedAt && (
              <div className="text-2xs font-medium text-slate-600 hidden sm:flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md">
                 <Save size={12} />
                 Đã lưu nháp {lastSavedAt.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
              </div>
            )}
         </div>

         <div className="flex items-center gap-3">
            <Button variant="ghost" type="button"
              onClick={async () => {
                if (lastSavedAt || isSaving) {
                  const confirmCancel = await confirm({
                    title: 'Hủy thao tác',
                    message: 'Dữ liệu đang được chỉnh sửa hoặc lưu nháp. Bạn có chắc muốn đóng và hủy bỏ?',
                    variant: 'warning'
                  });
                  if (!confirmCancel) return;
                }
                handleBack();
              }}
              disabled={isValidating || isSaving}
              className="px-6 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
               {currentStepIndex === 0 ? 'Hủy' : 'Quay lại'}
            </Button>
            
            {steps[currentStepIndex].canSkip && (
              <Button variant="ghost" onClick={handleSkip}
                disabled={isValidating || isSaving}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-brand-accent bg-brand-accent/5 hover:bg-brand-accent/10 transition-colors disabled:opacity-50"
              >
                 Bỏ qua bước này
              </Button>
            )}

            <Button variant="ghost" onClick={handleNext}
               disabled={isValidating || isSaving}
               className="premium-button text-xs px-8 py-2.5 bg-slate-900 text-white shadow-md disabled:opacity-50 flex items-center gap-2 relative overflow-hidden"
            >
               {isValidating || isSaving ? (
                 <>
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                   <span>Đang xử lý...</span>
                 </>
               ) : (
                 <>
                   {isCurrentStepLast ? 'Hoàn tất & Lưu' : 'Tiếp tục'}
                   {!isCurrentStepLast && <ChevronRight size={16} />}
                 </>
               )}
            </Button>
         </div>
      </div>
    </div>
  );
}
