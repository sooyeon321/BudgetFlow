import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";

type FormFieldProps = {
  label: string;
  error?: string;
  children: ReactNode;
};

export function FormField({ label, error, children }: FormFieldProps) {
  const generatedId = useId();
  const errorId = `${generatedId}-error`;
  const controlChildren = withFieldA11y(children, Boolean(error), errorId);

  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[var(--bf-text-primary)]">
        {label}
      </span>
      {controlChildren}
      {error ? (
        <span className="block text-xs text-destructive" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

function withFieldA11y(
  children: ReactNode,
  hasError: boolean,
  errorId: string,
): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement<FieldChildProps>(child)) {
      return child;
    }

    const nextProps: FieldChildProps = {};
    const childProps = child.props;
    const shouldEnhanceControl =
      isNativeControl(child.type) ||
      Boolean(
        typeof child.type !== "string" &&
          ("name" in childProps ||
            "value" in childProps ||
            "defaultValue" in childProps),
      );

    if (shouldEnhanceControl) {
      nextProps["aria-invalid"] = hasError ? true : undefined;
      nextProps["aria-describedby"] = hasError ? errorId : undefined;
    }

    if (childProps.children && !shouldEnhanceControl) {
      nextProps.children = withFieldA11y(childProps.children, hasError, errorId);
    }

    if (Object.keys(nextProps).length === 0) {
      return child;
    }

    return cloneElement(child as ReactElement<FieldChildProps>, nextProps);
  });
}

type FieldChildProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  children?: ReactNode;
  defaultValue?: unknown;
  name?: unknown;
  value?: unknown;
};

function isNativeControl(type: ReactElement["type"]) {
  return type === "input" || type === "select" || type === "textarea";
}
