import { useImperativeHandle, useRef } from 'react';
import type { AuthFormProps } from './AuthForm';

// Password managers only offer to save credentials from a real <form> submission.
export function AuthForm({ ref, onSubmit, children }: AuthFormProps) {
  const form = useRef<HTMLFormElement>(null);
  useImperativeHandle(ref, () => ({ submit: () => form.current?.requestSubmit() }), []);
  return (
    <form
      ref={form}
      style={{ display: 'flex', flexDirection: 'column' }}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}>
      {children}
    </form>
  );
}
