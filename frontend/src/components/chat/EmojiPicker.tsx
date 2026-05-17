import { useThemeStore } from "@/stores/useThemeStore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

interface EmojiPickerProps {
  onChange: (value: string) => void;
}

/**
 * Emoji picker button that opens a floating popover with the full emoji mart picker.
 * Theme (light/dark) is synchronized with ZALEGRAM's theme store.
 */
const EmojiPicker = ({ onChange }: EmojiPickerProps) => {
  const { isDark } = useThemeStore();

  return (
    <Popover>
      <PopoverTrigger
        asChild={false}
        className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
      >
        <Smile className="size-5" />
      </PopoverTrigger>

      <PopoverContent
        side="top"
        sideOffset={12}
        className="bg-transparent border-none shadow-none drop-shadow-none p-0 w-auto"
      >
        <Picker
          theme={isDark ? "dark" : "light"}
          data={data}
          onEmojiSelect={(emoji: { native: string }) => onChange(emoji.native)}
          emojiSize={22}
          previewPosition="none"
        />
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
