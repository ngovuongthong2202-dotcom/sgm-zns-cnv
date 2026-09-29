import React from "react";
import { Control, UseFormRegister, FieldErrors, UseFormSetValue } from "react-hook-form";
import { Quotation } from "@/src/domain/schema/quotation.schema";
import { ProductItem } from "@/src/domain/schema/product.schema";
import ProductListInput from "@/src/widgets/ProductListInput";

import { ItemSemanticType } from "@/src/widgets/product-list-input/useProductItemSemantic";

interface QuotationProductsArrayProps {
  control: Control<Quotation>;
  register: UseFormRegister<Quotation>;
  errors: FieldErrors<Quotation>;
  setValue: UseFormSetValue<Quotation>;
  defaultUnit: string;
  defaultItemType?: ItemSemanticType;
  showPrice: boolean;
  products: ProductItem[];
  disabled?: boolean;
  baseDateForBaoHanh?: string;
}

export function QuotationProductsArray({ setValue, defaultUnit, defaultItemType = 'MACHINE', showPrice, products, disabled, baseDateForBaoHanh }: QuotationProductsArrayProps) {
  const handleChange = React.useCallback((newProducts: ProductItem[]) => {
    setValue('products', newProducts, { shouldValidate: true, shouldDirty: true });
  }, [setValue]);

  return (
    <ProductListInput
      products={products}
      onChange={handleChange}
      defaultUnit={defaultUnit}
      defaultItemType={defaultItemType}
      showPrice={showPrice}
      showFinance={true} // Enable finance features here
      disabled={disabled}
      showBaoHanh={true}
      baseDateForBaoHanh={baseDateForBaoHanh}
    />
  );
}
