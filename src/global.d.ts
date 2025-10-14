declare module "sonner" {
  import * as React from "react";
  export type ExternalToast = {
    id?: string | number;
    description?: string | React.ReactNode;
    action?: React.ReactNode;
    dismissible?: boolean;
    duration?: number;
  };
  export const Toaster: React.FC<{ position?: string; richColors?: boolean }>;
  export const toast: {
    (message: string, opts?: ExternalToast): void;
    success(message: string, opts?: ExternalToast): void;
    error(message: string, opts?: ExternalToast): void;
    info(message: string, opts?: ExternalToast): void;
    warning(message: string, opts?: ExternalToast): void;
  };
}


