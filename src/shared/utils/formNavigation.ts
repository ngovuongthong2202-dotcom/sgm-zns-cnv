import React from 'react';

export const handleEnterToTab = (e: React.KeyboardEvent<HTMLFormElement>) => {
  if (
    e.key === 'Enter' && 
    e.target instanceof HTMLElement && 
    e.target.tagName !== 'TEXTAREA' && 
    e.target.tagName !== 'BUTTON'
  ) {
    if (e.target.closest('.no-enter-tab')) return;

    e.preventDefault();
    const form = e.currentTarget;
    const focusableElements = 'input:not([type="hidden"]):not([disabled]):not([readonly]), select:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), button:not([disabled]):not([readonly])';
    const elements = Array.from(form.querySelectorAll(focusableElements)) as HTMLElement[];
    const index = elements.indexOf(e.target);
    if (index > -1 && index < elements.length - 1) {
      elements[index + 1].focus();
    }
  }
};
