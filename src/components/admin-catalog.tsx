"use client";

import { useEffect, useState } from "react";
import type { Catalog, DiscountRule, Locale, Product, ProductPackage } from "@/lib/store-data";

type Tab = "products" | "categories" | "codes" | "offers";
