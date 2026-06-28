"use client";
import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface State { hasError: boolean }

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="rounded-full bg-red-50 p-5 mb-4">
            <AlertCircle size={36} className="text-red-400" />
          </div>
          <p className="text-lg font-semibold text-slate-800 mb-1">
            Что-то пошло не так
          </p>
          <p className="text-sm text-slate-400 mb-6 max-w-xs">
            Произошла непредвиденная ошибка. Попробуйте обновить страницу.
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
          >
            Попробовать снова
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}