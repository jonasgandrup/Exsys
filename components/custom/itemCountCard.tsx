"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define the type for inventory items
export type InventoryItem = {
  id: number;
  name: string;
  location: string;
  "min stock amount": number;
  "default quantity unit purchase": string;
  "quantity unit stock": string;
  "product group": string;
  "default store": string;
  currentCount?: number;
  countedAt?: string;
};

interface ItemCountCardProps {
  item: InventoryItem;
  onUpdateItem: (item: InventoryItem) => void;
  onNext: () => void;
  onBack: () => void;
  progress: {
    current: number;
    total: number;
  };
}

export default function ItemCountCard({
  item,
  onUpdateItem,
  onNext,
  onBack,
  progress,
}: ItemCountCardProps) {
  const [stockCount, setStockCount] = useState<number>(0);
  const [sliderValue, setSliderValue] = useState<number>(50);

  // Update state when item changes
  useEffect(() => {
    // Set initial count to min stock amount or 0
    setStockCount(item["min stock amount"] || 0);
    // Set slider to middle position initially
    setSliderValue(50);
  }, [item]);

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // If empty, set to 0
    if (value === "") {
      setStockCount(0);
      return;
    }

    const parsedValue = parseInt(value, 10);
    if (!isNaN(parsedValue) && parsedValue >= 0) {
      setStockCount(parsedValue);
      updateSliderFromCount(parsedValue);
    }
  };

  const handleSliderChange = (value: number[]) => {
    const sliderPos = value[0];
    setSliderValue(sliderPos);

    // Use slider to adjust count around the min stock amount
    const minStock = item["min stock amount"] || 0;
    const calculatedCount = Math.round(minStock * (sliderPos / 50));

    setStockCount(calculatedCount);
  };

  const updateSliderFromCount = (count: number) => {
    const minStock = item["min stock amount"] || 0;
    if (minStock === 0) {
      setSliderValue(50); // Default middle position
      return;
    }

    const sliderPos = Math.round((count / minStock) * 50);
    setSliderValue(Math.min(100, Math.max(0, sliderPos)));
  };

  const incrementCount = () => {
    const newValue = stockCount + 1;
    setStockCount(newValue);
    updateSliderFromCount(newValue);
  };

  const decrementCount = () => {
    const newValue = Math.max(0, stockCount - 1);
    setStockCount(newValue);
    updateSliderFromCount(newValue);
  };
  const saveAndContinue = async () => {
    // Create updated item with new count
    const updatedItem = {
      ...item,
      currentCount: stockCount,
      countedAt: new Date().toISOString(),
    };

    // // Initialize Supabase client
    // const supabase = createClient(
    //   process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    // );

    try {
      // Update the item in the database using the correct column names
      const { error } = await supabase
        .from("notes")
        .update({
          "current quantity": stockCount,
          "last quantity update": new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) {
        console.error("Error updating item:", error);
      }
    } catch (err) {
      console.error("Failed to update item in database:", err);
    }

    // Continue with the existing functionality
    onUpdateItem(updatedItem);
    onNext();
  };

  const countDifference = stockCount - (item["min stock amount"] || 0);
  return (
    <div className="max-w-md mx-auto md:max-w-2xl lg:max-w-full lg:w-full">
      <div className="border rounded-lg p-6 shadow-sm space-y-6 md:p-8 lg:p-10">
        {/* <div className="space-y-2 md:flex md:justify-between md:items-start">
          <div>
            <h3 className="text-xl font-semibold md:text-2xl lg:text-3xl">
              {item.name}
            </h3>
            <p className="text-sm text-muted-foreground md:text-base">
              Location: {item.location}
            </p>
            <p className="text-sm text-muted-foreground md:text-base">
              Min Stock: {item["min stock amount"]}
            </p>
          </div>
          <span className="text-sm text-muted-foreground block mt-2 md:mt-0 lg:text-base">
            {progress.current}/{progress.total} items
          </span>
        </div> */}
        <div className="space-y-2">
          <div>
            <h3 className="text-xl font-semibold md:text-2xl lg:text-3xl">
              {item.name}
            </h3>
            <p className="text-sm text-muted-foreground md:text-base">
              {progress.current}/{progress.total} items
            </p>
            <p className="text-sm text-muted-foreground md:text-base">
              <span className="font-bold">Location:</span> {item.location}
            </p>
            <p className="text-sm text-muted-foreground md:text-base">
              <span className="font-bold">Min Stock: </span>
              {item["min stock amount"]}
            </p>
          </div>
        </div>

        <div className="text-center md:flex md:items-center md:justify-center md:gap-6 lg:justify-start lg:gap-10">
          <div className="text-5xl font-bold mb-2 md:text-6xl md:mb-0 lg:text-7xl">
            {stockCount}
          </div>
          <div
            className={`text-sm md:text-base lg:text-lg ${
              countDifference > 0
                ? "text-green-500"
                : countDifference < 0
                  ? "text-red-500"
                  : "text-gray-500"
            }`}
          >
            {countDifference > 0 ? `+${countDifference}` : countDifference} from
            min stock
          </div>
        </div>

        {/* Layout for desktop: stacked controls */}
        <div className="space-y-6 lg:space-y-8">
          {/* Slider for count adjustment */}
          <div className="space-y-4 md:mt-8">
            <label className="text-sm font-medium md:text-base lg:text-lg">
              Adjust Count
            </label>
            <div className="flex items-center gap-2 md:gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={decrementCount}
                className="h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12"
              >
                <Minus className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />
              </Button>
              <div className="flex-1 px-1 md:px-4 lg:px-6">
                <Slider
                  value={[sliderValue]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={handleSliderChange}
                  className="my-2"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1 md:text-sm lg:text-base">
                  <span>0</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={incrementCount}
                className="h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12"
              >
                <Plus className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />
              </Button>
            </div>
          </div>

          {/* Input field for direct entry */}
          <div className="space-y-2 md:mt-8 lg:mt-4">
            <label
              htmlFor="count"
              className="text-sm font-medium md:text-base lg:text-lg"
            >
              Enter Exact Count
            </label>
            <Input
              id="count"
              type="number"
              min="0"
              value={stockCount === 0 ? "" : stockCount}
              onChange={handleCountChange}
              className="text-lg md:text-xl md:py-6 lg:text-2xl lg:py-8"
            />
          </div>
        </div>

        <div className="flex justify-between pt-4 md:pt-8 lg:pt-10">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="md:h-12 md:w-12 lg:h-14 lg:w-14"
          >
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />
          </Button>
          <Button
            onClick={saveAndContinue}
            className="md:px-8 md:py-6 md:text-lg lg:px-10 lg:py-7 lg:text-xl"
          >
            <ArrowRight className="h-4 w-4 mr-2 md:h-5 md:w-5 lg:h-6 lg:w-6" />
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
