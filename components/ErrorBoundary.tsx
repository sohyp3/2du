import { Component, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { DatabaseError } from '@/db/database';
import { useColors, useFontFamily } from '@/utils/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  const c = useColors();
  const fonts = useFontFamily();

  const isDatabaseError = error instanceof DatabaseError;
  const title = isDatabaseError ? 'Database Error' : 'Something went wrong';
  const message = error?.message || 'An unexpected error occurred. Please try again.';

  return (
    <View style={[styles.container, { backgroundColor: c.surface }]}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: isDatabaseError ? c.errorContainer : c.surfaceContainerHigh },
        ]}>
        <Text style={[styles.icon, { color: isDatabaseError ? c.error : c.primary }]}>
          {isDatabaseError ? '⚠️' : '🔧'}
        </Text>
      </View>

      <Text style={[styles.title, { fontFamily: fonts.bold, color: c.onSurface }]}>{title}</Text>

      <Text style={[styles.message, { fontFamily: fonts.regular, color: c.onSurfaceVariant }]}>
        {message}
      </Text>

      {isDatabaseError && (
        <Text style={[styles.hint, { fontFamily: fonts.regular, color: c.outline }]}>
          Database operations failed. This might be due to storage issues or corrupted data.
        </Text>
      )}

      <Pressable
        onPress={onRetry}
        style={[styles.button, { backgroundColor: c.primary }]}
        accessibilityLabel="Retry"
        accessibilityRole="button">
        <Text style={[styles.buttonText, { fontFamily: fonts.medium, color: c.onPrimary }]}>
          Try Again
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 300,
    lineHeight: 22,
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 280,
    lineHeight: 20,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
    minWidth: 160,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
  },
});
