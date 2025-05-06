"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
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

interface AddItemModalProps {
  onItemAdded?: () => void; // Optional callback for when an item is added
}

export default function AddItemModal({ onItemAdded }: AddItemModalProps = {}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast?.();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [productGroups, setProductGroups] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    "min stock amount": "",
    "current quantity": "",
    location: "",
    "product group": "",
    "default quantity unit purchase": "",
    "quantity unit stock": "",
    "default store": "",
  });

  const fieldToasts: Record<string, { title: string; description: string }> = {
    "product group": {
      title: "Product Group Required",
      description: "Please select a product group before adding the item.",
    },
    // Add other fields that need specific toast messages here
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    // Clear error when field is edited
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

      // Additional validation for specific fields
      if (name === "min stock amount" && numValue < 0) {
        setFieldErrors((prev) => ({ ...prev, [name]: "Cannot be negative" }));
      }

      if (name === "current quantity" && numValue < 0) {
        setFieldErrors((prev) => ({ ...prev, [name]: "Cannot be negative" }));
      }
    }

    // Update form data
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, "product group": value }));
  };

  // Update your form validation logic:
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset errors
    setError(null);
    let newFieldErrors: Record<string, string> = {};
    let hasErrors = false;
    let firstErrorField = ""; // Track the first field with an error

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

    // First, check ALL required fields and mark them
    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        newFieldErrors[field] = "This field is required";
        hasErrors = true;

        // Keep track of the first field with an error (for toast notification)
        if (!firstErrorField) {
          firstErrorField = field;
        }
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

    // Set all field errors immediately
    setFieldErrors(newFieldErrors);

    // Show a toast for the first error field if needed
    if (hasErrors && toast) {
      if (fieldToasts[firstErrorField]) {
        // Show field-specific toast
        toast({
          title: fieldToasts[firstErrorField].title,
          description: fieldToasts[firstErrorField].description,
          variant: "destructive",
        });
      } else {
        // Show generic toast
        toast({
          title: "Form Validation Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
      }
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      // First, get the maximum ID from the notes table
      const { data: maxIdData, error: maxIdError } = await supabase
        .from("notes")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);

      if (maxIdError) {
        console.error("Error fetching max ID:", maxIdError);
        throw maxIdError;
      }

      // Calculate the new ID
      const nextId =
        maxIdData && maxIdData.length > 0 ? maxIdData[0].id + 1 : 1;

      // Create numeric values for stock fields with the new ID
      const numericFormData = {
        id: nextId, // Set the ID explicitly
        ...formData,
        "min stock amount": formData["min stock amount"]
          ? parseInt(formData["min stock amount"])
          : 0,
        "current quantity": formData["current quantity"]
          ? parseInt(formData["current quantity"])
          : 0,
        "last quantity update": new Date().toISOString(), // Add the current timestamp
      };

      console.log(
        "Submitting data to Supabase with ID:",
        nextId,
        numericFormData
      );

      const { data, error } = await supabase
        .from("notes")
        .insert(numericFormData)
        .select();

      if (error) {
        console.error("Supabase error details:", error);
        throw error;
      }

      // Success! Reset form and close modal
      console.log("Item added successfully:", data);

      if (toast) {
        toast({
          title: "Item Added",
          description: `${formData.name} has been added to inventory`,
        });
      }

      // Reset form
      setFormData({
        name: "",
        "min stock amount": "",
        "current quantity": "",
        location: "",
        "product group": "",
        "default quantity unit purchase": "",
        "quantity unit stock": "",
        "default store": "",
      });

      // Close modal
      setOpen(false);

      // Notify parent component if callback exists
      if (onItemAdded) {
        onItemAdded();
      }
    } catch (err) {
      console.error("Error adding item:", err);
      // Log the complete error object for debugging
      console.log("Full error object:", JSON.stringify(err));
      setError(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function fetchProductGroups() {
      try {
        const supabase = createClient();

        // Use double quotes for column names with spaces
        const { data, error } = await supabase
          .from("notes")
          .select('"product group"') // Use double quotes around column name with space
          .not("product group", "eq", null) // Change "is" to "eq" for null comparison
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
  }, []);

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpenState) => {
        setOpen(newOpenState);
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
            <DialogDescription>
              Fill in the details to add a new item to your inventory.
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
              <Label htmlFor="min stock amount" className="text-right">
                Minimum Stock
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="min stock amount"
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
              <Label htmlFor="current quantity" className="text-right">
                Current Stock
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="current quantity"
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product group" className="text-right">
                Product Group
              </Label>
              <div className="col-span-3 space-y-1">
                <Select
                  value={formData["product group"]}
                  onValueChange={handleSelectChange}
                  onOpenChange={(open) => {
                    if (!open) {
                      setTimeout(() => {
                        document
                          .getElementById("product-group-select")
                          ?.focus();
                      }, 0);
                    }
                  }}
                >
                  <SelectTrigger
                    id="product-group-select"
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
                      <SelectItem value="Specielle flasker">
                        Specielle flasker
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
              <Label
                htmlFor="default quantity unit purchase"
                className="text-right"
              >
                Default Purchase Unit
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="default quantity unit purchase"
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
              <Label htmlFor="quantity unit stock" className="text-right">
                Stock Unit
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="quantity unit stock"
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
              <Label htmlFor="default store" className="text-right">
                Default Store
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="default store"
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
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
//tesst
