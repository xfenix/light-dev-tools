// The chrome picker takes a width since 2.18, the typings never caught up
import "react-color/lib/components/chrome/Chrome";

declare module "react-color/lib/components/chrome/Chrome" {
  interface ChromePickerProps {
    width?: string;
  }
}
