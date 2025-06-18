import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { UrlQueryParams } from "@/lib/use-cases/interfaces/url-params";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseCheckoutUrl(url: string): UrlQueryParams | null {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    const getNumberParam = (paramName: string): number => {
      const value = params.get(paramName);
      if (value === null) {
        throw new Error(`Missing required parameter: ${paramName}`);
      }
      const num = parseFloat(value);
      if (isNaN(num)) {
        throw new Error(`Invalid number format for parameter: ${paramName}`);
      }
      return num;
    };

    const getStringParam = (paramName: string): string => {
      const value = params.get(paramName);
      if (value === null) {
        throw new Error(`Missing required parameter: ${paramName}`);
      }
      return value;
    };

    const getBooleanParam = (paramName: string): boolean => {
      const value = params.get(paramName);
      return value === "1";
    };

    const parsedData: UrlQueryParams = {
      api_key: getStringParam("api_key"),
      size: getStringParam("size"),
      length: getNumberParam("length"),
      width: getNumberParam("width"),
      height: getNumberParam("height"),
      weight: getNumberParam("weight"),
      fragile: getBooleanParam("fragile"),
      business_name: getStringParam("business_name"),
      callback_url: decodeURIComponent(getStringParam("callback_url")), // Decode the URL-encoded callback_url
    };

    return parsedData;
  } catch (error) {
    console.error("Error parsing checkout URL:", error);
    // You might want to handle this error more gracefully in your app,
    // e.g., by redirecting to an error page or showing a user-friendly message.
    return null;
  }
}
