import "./progress-bar.css";
export type ProgressBarVariant =
    | "primary"
    | "info"
    | "success"
    | "warning"
    | "danger";

export interface ProgressBarProps {
    value: number;
    max?: number;
    label: string;
    valueText?: string;
    variant?: ProgressBarVariant;
    className?: string;
}

export default function ProgressBar({
    value,
    max = 100,
    label,
    valueText,
    variant = "primary",
    className = "",
}: ProgressBarProps) {
    const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
    const safeValue = Number.isFinite(value)
        ? Math.min(safeMax, Math.max(0, value))
        : 0;

    return (
        <progress
            className={`progress-meter progress-meter--${variant} ${className}`.trim()}
            max={safeMax}
            value={safeValue}
            aria-label={label}
            aria-valuetext={valueText}
        />
    );
}
