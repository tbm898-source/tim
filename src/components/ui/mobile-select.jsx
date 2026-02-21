import React, { useState } from 'react';
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

const MobileSelect = React.forwardRef(({ children, value, onValueChange, placeholder, ...props }, ref) => {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Extract options from children
  const options = React.Children.toArray(children).filter(
    child => child.type?.displayName === 'SelectItem'
  );

  const selectedOption = options.find(option => option.props.value === value);
  const displayValue = selectedOption?.props.children || placeholder;

  if (isMobile) {
    return (
      <>
        <button
          ref={ref}
          onClick={() => setOpen(true)}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm min-h-[44px]",
            "focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          )}
          {...props}
        >
          <span>{displayValue}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
        
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="bg-gray-900 border-gray-800">
            <DrawerHeader className="border-b border-gray-800">
              <DrawerTitle className="text-white">{placeholder || 'Select an option'}</DrawerTitle>
            </DrawerHeader>
            <div className="max-h-[60vh] overflow-y-auto">
              {options.map((option) => {
                const isSelected = option.props.value === value;
                return (
                  <button
                    key={option.props.value}
                    onClick={() => {
                      onValueChange(option.props.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-4 text-left min-h-[44px]",
                      "hover:bg-gray-800 transition-colors",
                      isSelected && "bg-cyan-900/30 text-cyan-400"
                    )}
                  >
                    <span className="text-base">{option.props.children}</span>
                    {isSelected && <Check className="h-5 w-5" />}
                  </button>
                );
              })}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop: use original Radix Select
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} {...props}>
      {children}
    </SelectPrimitive.Root>
  );
});

MobileSelect.displayName = "MobileSelect";

export { MobileSelect };