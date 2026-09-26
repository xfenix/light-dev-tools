// Since 3.x the decoder wants the whole page list to resolve the sub images,
// the typings still describe the older two argument form
import "utif";

declare module "utif" {
  export function decodeImage(buffer: ArrayBuffer, ifd: IFD, ifds: IFD[]): void;
}
