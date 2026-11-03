import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { GlassButton } from "../material/GlassButton";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary. Reports a sanitized signature (error name/message
 * only — never tokens, receipts, or private message content) and offers a
 * reload. Keeps the rest of the app alive after an unexpected screen crash.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Sanitized diagnostic: name + message, no stack, no data payloads.
    const signature = `${error.name}: ${error.message}`.slice(0, 300);
    console.error("[ErrorBoundary]", signature);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <ErrorFallback
        message={this.state.error.message}
        onReload={this.reset}
      />
    );
  }
}

function ErrorFallback({ message, onReload }: { message: string; onReload: () => void }) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: tokens.colors.canvas }]}>
      <Text style={[styles.title, { color: tokens.colors.text }]}>
        Something went wrong
      </Text>
      <Text style={[styles.body, { color: tokens.colors.textSecondary }]}>
        {message}
      </Text>
      <GlassButton label="Try again" onPress={onReload} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  body: { textAlign: "center" },
  button: { marginTop: 8, minWidth: 180 },
});

export default ErrorBoundary;