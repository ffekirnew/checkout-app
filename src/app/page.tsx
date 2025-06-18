"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  GoogleMap,
  Marker,
  useLoadScript,
  Libraries,
} from "@react-google-maps/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  getCreateOrderDefaultValue,
  CreateOrderDtoType,
  createOrderSchema,
} from "@/lib/validation-schemas/create-order-schema";
import { UrlQueryParams } from "@/lib/use-cases/interfaces/url-params";
import { parseCheckoutUrl } from "@/lib/utils";
import useCreateOrder from "@/lib/hooks/order/use-create-order";
import { ParcelSize } from "@/lib/use-cases/dtos/create-parcel-dto";
import { useRouter } from "next/navigation";

const googleMapsApiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY;
const libraries: Libraries = ["places"];
const defaultMapCenter = { lat: 9.005401, lng: 38.763611 };

const EasyDropCheckout = () => {
  const router = useRouter();
  const {
    mutate,
    data: order,
    error: orderError,
    isLoading: isOrderLoading,
  } = useCreateOrder();
  const [params, setParams] = useState<UrlQueryParams | null>(null);
  const form = useForm<CreateOrderDtoType>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: getCreateOrderDefaultValue(),
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentUrl = window.location.href;
      const parsed = parseCheckoutUrl(currentUrl);
      setParams(parsed);

      if (!parsed) {
        return;
      }

      form.setValue("parcel.size", parsed.size);
      form.setValue("parcel.length", parsed.length);
      form.setValue("parcel.width", parsed.width);
      form.setValue("parcel.height", parsed.height);
      form.setValue("parcel.weight", parsed.weight);
      form.setValue("parcel.fragile", parsed.fragile);
    }
  }, [form]);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: googleMapsApiKey!,
    libraries: libraries,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);
  const [searchAddress, setSearchAddress] = useState<string>("");

  const [markerPosition, setMarkerPosition] =
    useState<google.maps.LatLngLiteral>(() => {
      const defaultLat = defaultMapCenter.lat;
      const defaultLng = defaultMapCenter.lng;
      return defaultLat !== 0 && defaultLng !== 0
        ? { lat: defaultLat, lng: defaultLng }
        : defaultMapCenter;
    });

  useEffect(() => {
    if (isLoaded && !geocoder.current) {
      geocoder.current = new google.maps.Geocoder();
    }
  }, [isLoaded]);

  const reverseGeocodeAndUpdateForm = useCallback(
    (latLng: google.maps.LatLngLiteral) => {
      if (!geocoder.current) return;

      geocoder.current.geocode(
        { location: latLng },
        (
          results: google.maps.GeocoderResult[] | null,
          status: google.maps.GeocoderStatus,
        ) => {
          if (status === "OK" && results && results[0]) {
            form.setValue("location.address", results[0].formatted_address, {
              shouldValidate: true,
            });
          } else {
            console.error("Geocoder failed due to: " + status);
            form.setValue(
              "location.address",
              "Address not found for this location.",
              {
                shouldValidate: true,
              },
            );
          }
        },
      );
    },
    [form],
  );

  const onMapLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      setMap(mapInstance);
      mapInstance.setCenter(markerPosition);
      if (markerPosition.lat !== 0 || markerPosition.lng !== 0) {
        reverseGeocodeAndUpdateForm(markerPosition);
      }
    },
    [markerPosition, reverseGeocodeAndUpdateForm],
  );

  // Callback when the map component unmounts
  const onMapUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const latLngLiteral = { lat, lng };

      setMarkerPosition(latLngLiteral);
      form.setValue("location.latitude", parseFloat(lat.toFixed(6)), {
        shouldValidate: true,
      });
      form.setValue("location.longitude", parseFloat(lng.toFixed(6)), {
        shouldValidate: true,
      });
      reverseGeocodeAndUpdateForm(latLngLiteral);
    },
    [form, reverseGeocodeAndUpdateForm],
  );

  const onMarkerDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const latLngLiteral = { lat, lng };

      setMarkerPosition(latLngLiteral);
      form.setValue("location.latitude", parseFloat(lat.toFixed(6)), {
        shouldValidate: true,
      });
      form.setValue("location.longitude", parseFloat(lng.toFixed(6)), {
        shouldValidate: true,
      });
      reverseGeocodeAndUpdateForm(latLngLiteral);
    },
    [form, reverseGeocodeAndUpdateForm],
  );

  const handleAddressSearch = useCallback(() => {
    if (!geocoder.current || !map || !searchAddress) return;

    geocoder.current.geocode(
      { address: searchAddress },
      (
        results: google.maps.GeocoderResult[] | null,
        status: google.maps.GeocoderStatus,
      ) => {
        if (status === "OK" && results && results[0]) {
          const location = results[0].geometry.location;
          const lat = location.lat();
          const lng = location.lng();
          const latLngLiteral = { lat, lng };

          form.setValue("location.latitude", parseFloat(lat.toFixed(6)), {
            shouldValidate: true,
          });
          form.setValue("location.longitude", parseFloat(lng.toFixed(6)), {
            shouldValidate: true,
          });
          form.setValue("location.address", results[0].formatted_address, {
            shouldValidate: true,
          });

          map.setCenter(latLngLiteral);
          setMarkerPosition(latLngLiteral);
        } else {
          alert("Address not found or Geocoder failed: " + status);
          console.error("Geocoder failed due to: " + status);
        }
      },
    );
  }, [searchAddress, form, map]);

  const onSubmit = (data: CreateOrderDtoType) => {
    if (!params) {
      return;
    }

    data.phone_number = "251" + data.phone_number;
    data.parcel.size =
      data.parcel.size == "small"
        ? ParcelSize.SMALL
        : data.parcel.size == "medium"
          ? ParcelSize.MEDIUM
          : ParcelSize.LARGE;

    mutate(params?.api_key, data);
  };

  if (order) {
    if (!params) {
      return;
    }

    router.push(`${params?.callback_url}?delivery=success`);
  }

  if (orderError) {
    if (!params) {
      return;
    }

    router.push(`${params?.callback_url}?delivery=success`);
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-purple-200">
        <div className="max-w-6xl w-full bg-white rounded-xl shadow-2xl p-8 sm:p-10 lg:p-12">
          <div className="flex justify-center items-center h-[400px] w-full bg-gray-200 rounded-lg shadow-md mb-6 text-gray-500">
            Error loading map: {loadError.message}
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-purple-200">
        <div className="max-w-6xl w-full bg-white rounded-xl shadow-2xl p-8 sm:p-10 lg:p-12">
          <div className="flex justify-center items-center h-[400px] w-full bg-gray-200 rounded-lg shadow-md mb-6 text-gray-500">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-purple-200">
      <div className="max-w-6xl w-full bg-white rounded-xl shadow-2xl p-8 sm:p-10 lg:p-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900">EasyDrop</h1>
          <p className="mt-2 text-md text-gray-600">
            You have been redirected from{" "}
            <span className="font-bold">{params?.business_name}</span>, EasyDrop
            will complete your delivery.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-8">
                <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
                  <h2 className="text-xl font-bold text-gray-800 mb-6">
                    1. Your Contact Information
                  </h2>
                  <div className="grid grid-cols-1 gap-6">
                    <div className="flex flex-row justify-between items-center gap-6">
                      <FormField
                        control={form.control}
                        name="first_name"
                        render={({ field }) => (
                          <FormItem className="w-full">
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
                          <FormItem className="w-full">
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Ejigu" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="phone_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-300">
                            Phone Number
                          </FormLabel>
                          <FormControl>
                            <div className="flex w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-xs focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent overflow-hidden">
                              <span className="flex items-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 border-r border-gray-300 dark:border-gray-600">
                                +251
                              </span>
                              <Input
                                type="tel"
                                placeholder="903040506"
                                className="flex-1 border-none focus-visible:ring-0 focus-visible:outline-none bg-primary/0.5 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-l-none"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-red-500 text-sm" />
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
                              placeholder="kitaw.ejigu@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
                  <h2 className="text-xl font-bold text-gray-800 mb-6">
                    3. When do you need it delivered by?
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
              </div>

              <div className="flex flex-col gap-8">
                <div className="bg-gray-50 p-6 rounded-lg shadow-inner flex-grow">
                  <h2 className="text-xl font-bold text-gray-800 mb-6">
                    2. Where should we deliver?
                  </h2>
                  <div className="flex gap-2 mb-4">
                    <Input
                      type="text"
                      placeholder="Search for an address..."
                      value={searchAddress}
                      onChange={(e) => setSearchAddress(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddressSearch();
                        }
                      }}
                      className="flex-grow"
                    />
                    <Button type="button" onClick={handleAddressSearch}>
                      Search
                    </Button>
                  </div>
                  <GoogleMap
                    mapContainerStyle={{
                      height: "360px",
                      width: "100%",
                      borderRadius: "0.5rem",
                      boxShadow:
                        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    }}
                    center={markerPosition} // Map centers on the marker
                    zoom={13}
                    onLoad={onMapLoad}
                    onUnmount={onMapUnmount}
                    onClick={handleMapClick}
                  >
                    <Marker
                      position={markerPosition}
                      draggable={true}
                      onDragEnd={onMarkerDragEnd}
                    />
                  </GoogleMap>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input
                      type="hidden"
                      {...form.register("location.latitude")}
                    />
                    <input
                      type="hidden"
                      {...form.register("location.longitude")}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="">
              <Button
                type="submit"
                className="w-full text-lg py-3"
                disabled={isOrderLoading}
              >
                {isOrderLoading
                  ? "Creating your delivery..."
                  : "Complete Order"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default EasyDropCheckout;
