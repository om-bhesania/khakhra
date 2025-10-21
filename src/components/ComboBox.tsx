import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Customer data structure
 */
export interface Customer {
  id: string;
  name: string;
  number?: string;
  userId: string;
  paymentAmount?: number;
  paymentMode?: string;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Props for CustomerCombobox component
 */
export interface CustomerComboboxProps {
  /** Array of customer data to populate the combobox */
  customers: Customer[];
  /** Currently selected customer ID */
  value?: string;
  /** Callback when a customer is selected */
  onSelect?: (customer: Customer | null) => void;
  /** Callback when creating a new customer with typed name */
  onCreateNew?: (name: string) => void;
  /** Placeholder text for the trigger button */
  placeholder?: string;
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
  /** Message to show when no customers found */
  emptyMessage?: string;
  /** Text for the create new button */
  createNewText?: string;
  /** Whether the combobox is disabled */
  disabled?: boolean;
  /** Custom className for the trigger button */
  className?: string;
  /** Whether to show customer phone numbers in the list */
  showPhoneNumbers?: boolean;
  /** Allow creating new customers when no match found */
  allowCreateNew?: boolean;
}

/**
 * CustomerCombobox - A searchable combobox for selecting customers
 *
 * @example
 * ```tsx
 * <CustomerCombobox
 *   customers={custData}
 *   value={selectedCustomerId}
 *   onSelect={(customer) => {
 *     if (customer) {
 *       setSelectedCustomerId(customer.id);
 *       setCustomerName(customer.name);
 *       setCustomerPhone(customer.number || '');
 *     }
 *   }}
 *   onCreateNew={(name) => {
 *     setCustomerName(name);
 *     setSelectedCustomerId('');
 *   }}
 *   placeholder="Select customer..."
 *   allowCreateNew={true}
 * />
 * ```
 */
export const CustomerCombobox = React.forwardRef<
  HTMLButtonElement,
  CustomerComboboxProps
>(
  (
    {
      customers = [],
      value = "",
      onSelect,
      onCreateNew,
      placeholder = "Select customer...",
      searchPlaceholder = "Search customers...",
      emptyMessage = "No customer found.",
      createNewText = "Create",
      disabled = false,
      className,
      showPhoneNumbers = true,
      allowCreateNew = true,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const [searchValue, setSearchValue] = React.useState("");

    // Find selected customer
    const selectedCustomer = React.useMemo(
      () => customers.find((customer) => customer.id === value),
      [customers, value]
    );

    // Handle customer selection
    const handleSelect = React.useCallback(
      (customer: Customer) => {
        onSelect?.(customer);
        setOpen(false);
        setSearchValue("");
      },
      [onSelect]
    );

    // Handle create new customer
    const handleCreateNew = React.useCallback(() => {
      if (searchValue.trim()) {
        onCreateNew?.(searchValue.trim());
        setOpen(false);
        setSearchValue("");
      }
    }, [searchValue, onCreateNew]);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between",
              !selectedCustomer && "text-muted-foreground",
              className
            )}
          >
            <span className="truncate">
              {selectedCustomer ? selectedCustomer.name : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchValue}
              onValueChange={setSearchValue}
              className="h-9"
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    {emptyMessage}
                  </p>
                  {allowCreateNew && searchValue.trim() && (
                    <Button
                      size="sm"
                      onClick={handleCreateNew}
                      className="w-full"
                    >
                      {createNewText} "{searchValue}"
                    </Button>
                  )}
                </div>
              </CommandEmpty>
              <CommandGroup>
                {customers
                  .filter(
                    (customer) =>
                      customer.name
                        .toLowerCase()
                        .includes(searchValue.toLowerCase()) ||
                      customer.number?.includes(searchValue)
                  )
                  .map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.id}
                      onSelect={() => handleSelect(customer)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          value === customer.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium truncate">
                          {customer.name}
                        </span>
                        {showPhoneNumbers && customer.number && (
                          <span className="text-xs text-muted-foreground truncate">
                            {customer.number}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

CustomerCombobox.displayName = "CustomerCombobox";
