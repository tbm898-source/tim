import React, { useState } from 'react';
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

const MobileDropdownMenu = ({ children, ...props }) => {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const trigger = React.Children.toArray(children).find(
    child => child.type?.displayName === 'DropdownMenuTrigger'
  );
  
  const content = React.Children.toArray(children).find(
    child => child.type?.displayName === 'DropdownMenuContent'
  );

  if (isMobile && content) {
    const items = React.Children.toArray(content.props.children);
    
    return (
      <>
        <div onClick={() => setOpen(true)}>
          {trigger}
        </div>
        
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="bg-gray-900 border-gray-800">
            <DrawerHeader className="border-b border-gray-800 sr-only">
              <DrawerTitle>Options</DrawerTitle>
            </DrawerHeader>
            <div className="py-2">
              {items.map((item, idx) => {
                if (item.type?.displayName === 'DropdownMenuItem') {
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        item.props.onClick?.();
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center px-4 py-4 text-left min-h-[44px]",
                        "hover:bg-gray-800 transition-colors text-white"
                      )}
                    >
                      {item.props.children}
                    </button>
                  );
                }
                if (item.type?.displayName === 'DropdownMenuSeparator') {
                  return <div key={idx} className="my-1 h-px bg-gray-800" />;
                }
                return item;
              })}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop: use original Radix DropdownMenu
  return (
    <DropdownMenuPrimitive.Root open={open} onOpenChange={setOpen} {...props}>
      {children}
    </DropdownMenuPrimitive.Root>
  );
};

MobileDropdownMenu.displayName = "MobileDropdownMenu";

export { MobileDropdownMenu };