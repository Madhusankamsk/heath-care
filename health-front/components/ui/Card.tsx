import type { ReactNode } from "react";
import {
  CardBase,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card-base";

export type CardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
};

export function Card({ title, description, children }: CardProps) {
  return (
    <CardBase className="p-5 sm:p-6">
      {title ? (
        <CardHeader className="mb-5 border-b border-[var(--border)] pb-4">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
      ) : null}
      <CardContent>{children}</CardContent>
    </CardBase>
  );
}

