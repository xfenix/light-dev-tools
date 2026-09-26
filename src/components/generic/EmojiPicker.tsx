import { useEffect, useRef } from "react";

import { Picker } from "emoji-mart";
import emojiData from "@emoji-mart/data";

export type PickedEmoji = { native: string };

type EmojiPickerProps = {
  onSelect: (pickedEmoji: PickedEmoji) => void;
};

// The picker is a web component, so it is created once and mounted by hand,
// the latest handler is taken from the ref on every pick
export default function EmojiPicker(props: EmojiPickerProps) {
  const pickerBox = useRef<HTMLDivElement>(null);
  const selectHandler = useRef(props.onSelect);

  useEffect(() => {
    selectHandler.current = props.onSelect;
  });

  useEffect(() => {
    // the typings of the picker lose its HTMLElement ancestry on the way
    const pickerElement = new Picker({
      data: emojiData,
      set: "native",
      previewPosition: "none",
      // the site itself has no dark mode, the picker should not have one too
      theme: "light",
      onEmojiSelect: (pickedEmoji: PickedEmoji) =>
        selectHandler.current(pickedEmoji),
    }) as unknown as HTMLElement;
    pickerBox.current?.appendChild(pickerElement);
    return () => pickerElement.remove();
  }, []);

  return <div ref={pickerBox} />;
}
