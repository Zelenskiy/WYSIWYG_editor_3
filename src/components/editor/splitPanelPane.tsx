import { ReactNode } from "react";

interface SplitPanelPaneProps {
  block: ReactNode | null;
  styles: { [key: string]: React.CSSProperties };
  startResize: React.MouseEventHandler<HTMLDivElement> | undefined;
}

export function SplitPanelPane({ block }: SplitPanelPaneProps) {
  return <>{block}</>;
}
