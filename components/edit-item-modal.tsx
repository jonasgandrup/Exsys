"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Define InventoryItem type
type InventoryItem = {
  id: number;
  name: string;
  location: string;
  "min stock amount": number;
  "default quantity unit purchase": string;
  "quantity unit stock": string;
  "product group": string;
  "default store": string;
  "current quantity"?: number;
};

interface EditItemModalProps {
  item: InventoryItem;
  onItemUpdated?: () => Promise<void> | void; // Callback for when an item is updated
}

export default function EditItemModal({
  item,
  onItemUpdated,
}: EditItemModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentItemId, setCurrentItemId] = useState<number>(item.id);
  const { toast } = useToast();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [productGroups, setProductGroups] = useState<string[]>([]);

  // Initialize form data with the current item values
  const [formData, setFormData] = useState({
    id: item.id, // Explicitly include the ID in form data
    name: item.name,
    "min stock amount": item["min stock amount"].toString(),
    "current quantity": (item["current quantity"] || "0").toString(),
    location: item.location,
    "product group": item["product group"],
    "default quantity unit purchase": item["default quantity unit purchase"],
    "quantity unit stock": item["quantity unit stock"],
    "default store": item["default store"],
  });

  // Update the currentItemId and form data when item prop changes or dialog opens
  useEffect(() => {
    setCurrentItemId(item.id);

    if (open) {
      setFormData({
        id: item.id,
        name: item.name,
        "min stock amount": item["min stock amount"].toString(),
        "current quantity": (item["current quantity"] || "0").toString(),
        location: item.location,
        "product group": item["product group"],
        "default quantity unit purchase":
          item["default quantity unit purchase"],
        "quantity unit stock": item["quantity unit stock"],
        "default store": item["default store"],
      });
    }
  }, [item, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));

    // Validate number fields
    if (type === "number" && value !== "") {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        setFieldErrors((prev) => ({
          ...prev,
          [name]: "Must be a valid number",
        }));
        return;
      }

      if (
        (name === "min stock amount" || name === "current quantity") &&
        numValue < 0
      ) {
        setFieldErrors((prev) => ({ ...prev, [name]: "Cannot be negative" }));
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, "product group": value }));
    setFieldErrors((prev) => ({ ...prev, "product group": "" }));
  };

  // Update form submission handler with manual event handling
  const handleSubmit = async (e: React.FormEvent) => {
    //e.preventDefault();
    e.stopPropagation();

    // Verify we have a valid ID to update
    if (!currentItemId) {
      setError("Missing item ID for update");
      toast?.({
        title: "Update Error",
        description: "Could not identify which item to update.",
        variant: "destructive",
      });
      return;
    }

    // Reset errors
    setError(null);
    let newFieldErrors: Record<string, string> = {};
    let hasErrors = false;

    // Define required fields
    const requiredFields = [
      "name",
      "location",
      "product group",
      "min stock amount",
      "current quantity",
      "default quantity unit purchase",
      "quantity unit stock",
      "default store",
    ];

    // Check all required fields
    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        newFieldErrors[field] = "This field is required";
        hasErrors = true;
      }
    }

    // Validate number fields
    const numberFields = ["min stock amount", "current quantity"];
    for (const field of numberFields) {
      const value = formData[field as keyof typeof formData];
      if (value && isNaN(Number(value))) {
        newFieldErrors[field] = "Must be a valid number";
        hasErrors = true;
      }
    }

    setFieldErrors(newFieldErrors);

    if (hasErrors) {
      toast?.({
        title: "Form Validation Error",
        description: "Please fill in all required fields correctly.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create Supabase client
      const supabase = createClient();

      // Convert string values to numbers for numeric fields
      const numericFormData = {
        name: formData.name,
        location: formData.location,
        "product group": formData["product group"],
        "min stock amount": parseInt(formData["min stock amount"]),
        "current quantity": parseInt(formData["current quantity"]),
        "default quantity unit purchase":
          formData["default quantity unit purchase"],
        "quantity unit stock": formData["quantity unit stock"],
        "default store": formData["default store"],
        "last quantity update": new Date().toISOString(),
      };

      console.log(`Updating item ID: ${currentItemId}`, numericFormData);

      // Update the item in the database - using manual fetch for more control
      const { data, error: updateError } = await supabase
        .from("notes")
        .update(numericFormData)
        .eq("id", currentItemId)
        .select();

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }

      console.log("Update successful:", data);

      // Show success toast
      toast?.({
        title: "Item Updated",
        description: `${formData.name} has been updated successfully`,
      });

      // Close modal
      setOpen(false);

      // Notify parent component
      if (onItemUpdated) {
        await onItemUpdated();
      }
    } catch (err) {
      console.error("Error updating item:", err);
      setError(err instanceof Error ? err.message : "Failed to update item");

      toast?.({
        title: "Update Failed",
        description:
          err instanceof Error
            ? err.message
            : "Something went wrong while updating the item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch product groups
  useEffect(() => {
    async function fetchProductGroups() {
      if (!open) return; // Only fetch when modal is open

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("notes")
          .select('"product group"')
          .not("product group", "eq", null)
          .order("product group");

        if (error) throw error;

        // Extract unique product groups
        const uniqueGroups = Array.from(
          new Set(data.map((item) => item["product group"]))
        ).filter(Boolean) as string[];

        setProductGroups(uniqueGroups);
      } catch (err) {
        console.error("Error fetching product groups:", err);
      }
    }

    fetchProductGroups();
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpenState) => {
        setOpen(newOpenState);
        if (!newOpenState) {
          // Reset errors when dialog closes
          setError(null);
          setFieldErrors({});
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-transparent absolute top-2 right-11"
          onClick={(e) => {
            e.stopPropagation(); // This is critical - it prevents the click from bubbling up
            //e.preventDefault(); // Additionally prevent default behavior
            setOpen(true);
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[425px]"
        onPointerDownCapture={(e) => e.stopPropagation()} // Add this line
        onClick={(e) => e.stopPropagation()} // Add this line
        onMouseDown={(e) => e.stopPropagation()} // Add this line
      >
        {/* Use a button click handler instead of native form submission */}
        <div>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Update the details for {item.name} (ID: {currentItemId})
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md mb-4">
              {error}
            </div>
          )}

          <div className="grid gap-4 py-4">
            {/* Name field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={fieldErrors.name ? "border-red-500" : ""}
                />
                {fieldErrors.name && (
                  <p className="text-xs text-red-500">{fieldErrors.name}</p>
                )}
              </div>
            </div>

            {/* Minimum Stock field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="min-stock-amount" className="text-right">
                Minimum Stock
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="min-stock-amount"
                  name="min stock amount"
                  type="number"
                  value={formData["min stock amount"]}
                  onChange={handleChange}
                  className={
                    fieldErrors["min stock amount"] ? "border-red-500" : ""
                  }
                />
                {fieldErrors["min stock amount"] && (
                  <p className="text-xs text-red-500">
                    {fieldErrors["min stock amount"]}
                  </p>
                )}
              </div>
            </div>

            {/* Current Stock field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="current-quantity" className="text-right">
                Current Stock
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="current-quantity"
                  name="current quantity"
                  type="number"
                  min="0"
                  value={formData["current quantity"]}
                  onChange={handleChange}
                  className={
                    fieldErrors["current quantity"] ? "border-red-500" : ""
                  }
                />
                {fieldErrors["current quantity"] && (
                  <p className="text-xs text-red-500">
                    {fieldErrors["current quantity"]}
                  </p>
                )}
              </div>
            </div>

            {/* Location field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">
                Location
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className={fieldErrors.location ? "border-red-500" : ""}
                />
                {fieldErrors.location && (
                  <p className="text-xs text-red-500">{fieldErrors.location}</p>
                )}
              </div>
            </div>

            {/* Product Group field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product-group" className="text-right">
                Product Group
              </Label>
              <div className="col-span-3 space-y-1">
                <Select
                  value={formData["product group"]}
                  onValueChange={handleSelectChange}
                >
                  <SelectTrigger
                    id="product-group"
                    className={
                      fieldErrors["product group"] ? "border-red-500" : ""
                    }
                  >
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {productGroups.length > 0 ? (
                      productGroups.map((group) => (
                        <SelectItem key={group} value={group}>
                          {group}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value={item["product group"]}>
                        {item["product group"]}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {fieldErrors["product group"] && (
                  <p className="text-xs text-red-500">
                    {fieldErrors["product group"]}
                  </p>
                )}
              </div>
            </div>

            {/* Default Purchase Unit field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="default-purchase-unit" className="text-right">
                Purchase Unit
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="default-purchase-unit"
                  name="default quantity unit purchase"
                  value={formData["default quantity unit purchase"]}
                  onChange={handleChange}
                  className={
                    fieldErrors["default quantity unit purchase"]
                      ? "border-red-500"
                      : ""
                  }
                />
                {fieldErrors["default quantity unit purchase"] && (
                  <p className="text-xs text-red-500">
                    {fieldErrors["default quantity unit purchase"]}
                  </p>
                )}
              </div>
            </div>

            {/* Stock Unit field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity-unit-stock" className="text-right">
                Stock Unit
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="quantity-unit-stock"
                  name="quantity unit stock"
                  value={formData["quantity unit stock"]}
                  onChange={handleChange}
                  className={
                    fieldErrors["quantity unit stock"] ? "border-red-500" : ""
                  }
                />
                {fieldErrors["quantity unit stock"] && (
                  <p className="text-xs text-red-500">
                    {fieldErrors["quantity unit stock"]}
                  </p>
                )}
              </div>
            </div>

            {/* Default Store field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="default-store" className="text-right">
                Default Store
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="default-store"
                  name="default store"
                  value={formData["default store"]}
                  onChange={handleChange}
                  className={
                    fieldErrors["default store"] ? "border-red-500" : ""
                  }
                />
                {fieldErrors["default store"] && (
                  <p className="text-xs text-red-500">
                    {fieldErrors["default store"]}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={loading}>
              {loading ? "Updating..." : "Update Item"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
