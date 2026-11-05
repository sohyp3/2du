import { useImperativeHandle, type ReactNode, type Ref } from 'react';
import { View } from 'react-native';

export interface AuthFormHandle {
  submit: () => void;
}
export interface AuthFormProps {
  ref: Ref<AuthFormHandle>;
  onSubmit: () => void;
  children: ReactNode;
}

export function AuthForm({ ref, onSubmit, children }: AuthFormProps) {
  useImperativeHandle(ref, () => ({ submit: onSubmit }), [onSubmit]);
  return <View>{children}</View>;
}
