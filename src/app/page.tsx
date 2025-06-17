"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Shadcn UI components
// Assuming these paths are correct relative to your project structure
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Declare google globally for TypeScript if loading via script tag
declare let google: any;

// Zod schema for CreateOrderDto
const createOrderSchema = z.object({
  first_name: z.string().min(1, "First name is required."),
  last_name: z.string().min(1, "Last name is required."),
  phone_number: z
    .string()
    .min(10, "Phone number is required.")
    .regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format."), // Basic phone number regex
  email: z
    .string()
    .email("Invalid email address.")
    .min(1, "Email is required."),

  location: z.object({
    address: z.string().min(1, "Address is required."),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    postal_code: z.string().optional(),
  }),

  latest_time_of_delivery: z.string().min(1, "Delivery time is required."), // datetime-local outputs string

  parcel: z.object({
    size: z.enum(["small", "medium", "large"], {
      message: "Parcel size is required.",
    }),
    length: z
      .number()
      .positive("Length must be positive.")
      .min(0.1, "Length is required."),
    width: z
      .number()
      .positive("Width must be positive.")
      .min(0.1, "Width is required."),
    height: z
      .number()
      .positive("Height must be positive.")
      .min(0.1, "Height is required."),
    weight: z
      .number()
      .positive("Weight must be positive.")
      .min(0.1, "Weight is required."),
    fragile: z.boolean(),
  }),
});

type CreateOrderDtoType = z.infer<typeof createOrderSchema>;

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const EasyDropCheckout = () => {
  const mapRef = useRef(null); // Ref for the map container DOM element
  const mapInstance = useRef<google.maps.Map | null>(null); // Ref for the Google Maps map instance
  const markerInstance = useRef<google.maps.Marker | null>(null); // Ref for the Google Maps marker instance
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false); // State to track Google Maps script loading
  const [searchAddress, setSearchAddress] = useState<string>(""); // State for address search input

  const form = useForm<CreateOrderDtoType>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      first_name: "John",
      last_name: "Doe",
      phone_number: "+251900000000",
      email: "default@ed.com",
      location: {
        address: "Bole Int'l Airport, Addis Ababa, Ethiopia",
        latitude: 8.9806, // Default to Addis Ababa for Google Maps
        longitude: 38.7578, // Default to Addis Ababa for Google Maps
        postal_code: "1000",
      },
      latest_time_of_delivery: "",
      parcel: {
        size: "small", // Default to small
        length: 0.1,
        width: 0.1,
        height: 0.1,
        weight: 0.1,
        fragile: false,
      },
    },
  });

  // Dynamic Google Maps loading using a script tag
  useEffect(() => {
    let googleMapsScript: HTMLScriptElement | null = null;

    const loadGoogleMaps = () => {
      // Create and append Google Maps JavaScript script
      googleMapsScript = document.createElement("script");
      googleMapsScript.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&callback=initMap`; // Added places library
      googleMapsScript.async = true;
      googleMapsScript.defer = true;

      // Define a global callback function for Google Maps API to call once loaded
      // This function sets the isGoogleMapsLoaded state to true
      window.initMap = () => {
        setIsGoogleMapsLoaded(true);
      };

      document.body.appendChild(googleMapsScript);
    };

    // Only load Google Maps if it's not already defined globally or loading
    if (typeof google === "undefined" || typeof google.maps === "undefined") {
      loadGoogleMaps();
    } else {
      // If Google Maps is already defined (e.g., from a previous component instance), set state immediately
      setIsGoogleMapsLoaded(true);
    }

    // Cleanup function for dynamically added elements and global callback
    return () => {
      if (googleMapsScript && document.body.contains(googleMapsScript)) {
        document.body.removeChild(googleMapsScript);
      }
      // Clean up the global callback to avoid potential conflicts
      if (typeof window.initMap === "function") {
        delete window.initMap;
      }
      // Although Google Maps API doesn't have a direct 'remove' for the map object,
      // setting it to null allows for garbage collection and prevents issues on re-mount.
      if (mapInstance.current) {
        mapInstance.current = null;
      }
    };
  }, []); // Rerun if API key changes (should be stable)

  // Geocoder instance
  const geocoder = useRef<google.maps.Geocoder | null>(null);

  // Initialize and manage the Google Map ONLY when Google Maps is loaded
  useEffect(() => {
    // Ensure Google Maps API is loaded, mapRef is available, and map hasn't been initialized yet
    if (
      isGoogleMapsLoaded &&
      mapRef.current &&
      !mapInstance.current &&
      typeof google !== "undefined" &&
      typeof google.maps !== "undefined"
    ) {
      // Initialize Geocoder
      geocoder.current = new google.maps.Geocoder();

      // Get default latitude and longitude from form state for initial map center
      const defaultLat = form.getValues("location.latitude");
      const defaultLng = form.getValues("location.longitude");

      // Initialize Google Map
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center: { lat: defaultLat, lng: defaultLng },
        zoom: 13,
      });

      // Initialize marker at the default location, make it draggable
      markerInstance.current = new google.maps.Marker({
        position: { lat: defaultLat, lng: defaultLng },
        map: mapInstance.current,
        draggable: true, // Allow dragging the marker
      });

      // Function to reverse geocode and update address field
      const reverseGeocodeAndUpdateForm = (
        latLng: google.maps.LatLngLiteral,
      ) => {
        if (!geocoder.current) return;

        geocoder.current.geocode(
          { location: latLng },
          (
            results: google.maps.GeocoderResult[],
            status: google.maps.GeocoderStatus,
          ) => {
            if (status === "OK" && results[0]) {
              form.setValue("location.address", results[0].formatted_address, {
                shouldValidate: true,
              });
              // Optionally, try to extract postal code if available
              const postalCodeComponent = results[0].address_components.find(
                (component) => component.types.includes("postal_code"),
              );
              if (postalCodeComponent) {
                form.setValue(
                  "location.postal_code",
                  postalCodeComponent.long_name,
                  { shouldValidate: true },
                );
              } else {
                form.setValue("location.postal_code", "", {
                  shouldValidate: true,
                });
              }
            } else {
              console.error("Geocoder failed due to: " + status);
              form.setValue(
                "location.address",
                "Address not found for this location.",
                { shouldValidate: true },
              );
              form.setValue("location.postal_code", "", {
                shouldValidate: true,
              });
            }
          },
        );
      };

      // Add a click listener to the map to update marker position and form fields
      mapInstance.current.addListener(
        "click",
        (e: google.maps.MapMouseEvent) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          const latLngLiteral = { lat, lng };

          // Update form values for latitude and longitude fields
          form.setValue("location.latitude", parseFloat(lat.toFixed(6)), {
            shouldValidate: true,
          });
          form.setValue("location.longitude", parseFloat(lng.toFixed(6)), {
            shouldValidate: true,
          });

          // Set marker position
          if (markerInstance.current) {
            markerInstance.current.setPosition(e.latLng);
          }

          // Reverse geocode and update address
          reverseGeocodeAndUpdateForm(latLngLiteral);
        },
      );

      // Add a listener for marker drag end to update form fields
      markerInstance.current.addListener(
        "dragend",
        (e: google.maps.MapMouseEvent) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          const latLngLiteral = { lat, lng };

          form.setValue("location.latitude", parseFloat(lat.toFixed(6)), {
            shouldValidate: true,
          });
          form.setValue("location.longitude", parseFloat(lng.toFixed(6)), {
            shouldValidate: true,
          });

          // Reverse geocode and update address
          reverseGeocodeAndUpdateForm(latLngLiteral);
        },
      );

      // Initial reverse geocode for default location
      if (defaultLat !== 0 || defaultLng !== 0) {
        reverseGeocodeAndUpdateForm({ lat: defaultLat, lng: defaultLng });
      }
    }
  }, [isGoogleMapsLoaded, form]); // This effect depends on isGoogleMapsLoaded and the form instance

  // Handler for address search
  const handleAddressSearch = useCallback(() => {
    if (!geocoder.current || !mapInstance.current || !searchAddress) return;

    geocoder.current.geocode(
      { address: searchAddress },
      (
        results: google.maps.GeocoderResult[],
        status: google.maps.GeocoderStatus,
      ) => {
        if (status === "OK" && results[0]) {
          const location = results[0].geometry.location;
          const lat = location.lat();
          const lng = location.lng();

          // Update form fields
          form.setValue("location.latitude", parseFloat(lat.toFixed(6)), {
            shouldValidate: true,
          });
          form.setValue("location.longitude", parseFloat(lng.toFixed(6)), {
            shouldValidate: true,
          });
          form.setValue("location.address", results[0].formatted_address, {
            shouldValidate: true,
          });

          // Optionally, try to extract postal code if available
          const postalCodeComponent = results[0].address_components.find(
            (component) => component.types.includes("postal_code"),
          );
          if (postalCodeComponent) {
            form.setValue(
              "location.postal_code",
              postalCodeComponent.long_name,
              { shouldValidate: true },
            );
          } else {
            form.setValue("location.postal_code", "", { shouldValidate: true });
          }

          // Center map and update marker
          mapInstance.current.setCenter(location);
          if (markerInstance.current) {
            markerInstance.current.setPosition(location);
          } else {
            markerInstance.current = new google.maps.Marker({
              position: location,
              map: mapInstance.current,
              draggable: true,
            });
            markerInstance.current.addListener(
              "dragend",
              (e: google.maps.MapMouseEvent) => {
                const dragLat = e.latLng.lat();
                const dragLng = e.latLng.lng();
                form.setValue(
                  "location.latitude",
                  parseFloat(dragLat.toFixed(6)),
                  { shouldValidate: true },
                );
                form.setValue(
                  "location.longitude",
                  parseFloat(dragLng.toFixed(6)),
                  { shouldValidate: true },
                );
                // Reverse geocode for dragged marker
                reverseGeocodeAndUpdateForm({ lat: dragLat, lng: dragLng });
              },
            );
          }
        } else {
          alert("Address not found or Geocoder failed: " + status); // Use a custom modal in production
          console.error("Geocoder failed due to: " + status);
        }
      },
    );
  }, [searchAddress, form]); // Dependency on searchAddress to trigger search on change/submit

  // Handler for form submission
  const onSubmit = (data: CreateOrderDtoType) => {
    console.log("Collected Order Data:", data);
    alert(
      "Order data logged to console. In a real app, this would be sent to the backend!",
    );
  };

  // Render a loading message if Google Maps is not yet loaded
  if (!isGoogleMapsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-purple-200">
        <div className="max-w-6xl w-full bg-white rounded-xl shadow-2xl p-8 sm:p-10 lg:p-12">
          <div className="flex justify-center items-center h-[400px] w-full bg-gray-200 rounded-lg shadow-md mb-6 text-gray-500">
            Loading map...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-purple-200">
      <div className="max-w-6xl w-full bg-white rounded-xl shadow-2xl p-8 sm:p-10 lg:p-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900">EasyDrop</h1>
          <p className="mt-2 text-lg text-gray-600">Complete Your Delivery</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Contact Info and Parcel Details (Side-by-Side on MD+) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 1. Your Contact Information */}
              <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  1. Your Contact Information
                </h2>
                <div className="grid grid-cols-1 gap-6">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Kitaw" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Ejigu" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+251903040506"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="john.doe@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* 3. Parcel Details */}
              <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  2. Tell us about your parcel
                </h2>
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="parcel.size"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Parcel Size</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-wrap gap-4"
                          >
                            {/* Each RadioGroupItem needs a unique ID, and its FormLabel should link to it using htmlFor */}
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="small" id="size-small" />
                              </FormControl>
                              <FormLabel
                                htmlFor="size-small"
                                className="font-normal cursor-pointer"
                              >
                                Small (e.g., envelope, book)
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem
                                  value="medium"
                                  id="size-medium"
                                />
                              </FormControl>
                              <FormLabel
                                htmlFor="size-medium"
                                className="font-normal cursor-pointer"
                              >
                                Medium (e.g., shoebox, small bag)
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="large" id="size-large" />
                              </FormControl>
                              <FormLabel
                                htmlFor="size-large"
                                className="font-normal cursor-pointer"
                              >
                                Large (e.g., small appliance, bicycle)
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Dimensions */}
                  <div>
                    {/* Using a regular Label here as FormField is around each Input for individual messages */}
                    <Label className="block text-sm font-medium text-gray-700 mb-1">
                      Dimensions (cm)
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="parcel.length"
                        render={({ field }) => (
                          <FormItem>
                            {/* <FormLabel className="sr-only">Length</FormLabel> Use sr-only if you want a label for screen readers but not visible */}
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Length"
                                min={0.1}
                                step={0.1}
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseFloat(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="parcel.width"
                        render={({ field }) => (
                          <FormItem>
                            {/* <FormLabel className="sr-only">Width</FormLabel> */}
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Width"
                                min={0.1}
                                step={0.1}
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseFloat(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="parcel.height"
                        render={({ field }) => (
                          <FormItem>
                            {/* <FormLabel className="sr-only">Height</FormLabel> */}
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Height"
                                min={0.1}
                                step={0.1}
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseFloat(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Weight */}
                  <FormField
                    control={form.control}
                    name="parcel.weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 1.5"
                            min={0.1}
                            step={0.1}
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Fragile Toggle */}
                  <FormField
                    control={form.control}
                    name="parcel.fragile"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Is this parcel fragile?
                          </FormLabel>
                          <FormDescription>
                            Toggle if your parcel requires special handling.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                3. Where should we deliver?
              </h2>
              {/* Address Search Input */}
              <div className="flex gap-2 mb-4">
                <Input
                  type="text"
                  placeholder="Search for an address..."
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault(); // Prevent form submission
                      handleAddressSearch();
                    }
                  }}
                  className="flex-grow"
                />
                <Button type="button" onClick={handleAddressSearch}>
                  Search
                </Button>
              </div>

              {/* Conditional rendering for map while Google Maps loads */}
              {!isGoogleMapsLoaded && (
                <div className="flex justify-center items-center h-[400px] w-full bg-gray-200 rounded-lg shadow-md mb-6 text-gray-500">
                  Loading map...
                </div>
              )}
              {/* The map div will only be visible and initialized when Google Maps is loaded */}
              <div
                id="map"
                ref={mapRef}
                className={`h-[400px] w-full rounded-lg shadow-md mb-6 ${isGoogleMapsLoaded ? "" : "hidden"}`}
              ></div>
              <p className="text-sm text-gray-500 mt-4 mb-4">
                Click on the map to select your exact delivery point, or drag
                the marker. The latitude and longitude will be auto-filled. You
                can then refine the address below.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="location.address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 123 Main St, Anytown, State, Country"
                          {...field}
                          // This input is primarily updated by map/search, but user can refine
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location.postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <input type="hidden" {...form.register("location.latitude")} />
                <input type="hidden" {...form.register("location.longitude")} />
              </div>
            </div>

            {/* 4. Latest Delivery Time */}
            <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                4. When do you need it delivered by?
              </h2>
              <FormField
                control={form.control}
                name="latest_time_of_delivery"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latest Delivery Date & Time</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value || ""} // Ensure it's a controlled component
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="pt-6">
              <Button type="submit" className="w-full text-lg py-3">
                Complete Order
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default EasyDropCheckout;
