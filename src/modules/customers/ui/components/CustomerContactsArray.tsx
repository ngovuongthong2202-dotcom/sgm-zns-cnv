import React from "react";
import { useFieldArray, Control, UseFormRegister, FieldErrors, UseFormSetValue } from "react-hook-form";
import { Customer } from "@/src/domain/schema/customer.schema";
import { Button } from "@/src/design-system/Button";
import { Plus, Trash, Contact, Users, Check } from "lucide-react";
import { cleanProperVietnameseText } from "@/src/shared/utils/textFormatter";
import { sanitizePhoneVN, sanitizeText } from "@/src/shared/utils/inputSanitizer";

interface CustomerContactsArrayProps {
  control: Control<Customer>;
  register: UseFormRegister<Customer>;
  errors: FieldErrors<Customer>;
  setValue: UseFormSetValue<Customer>;
  isIndividual?: boolean;
}

export function CustomerContactsArray({ control, register, errors, setValue, isIndividual }: CustomerContactsArrayProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "contacts"
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 p-5 shrink-0">
        <div className="flex items-center gap-2">
          <Contact size={16} className="text-slate-800" />
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            3. Danh Bạ Đầu Mối Liên Hệ Chính
          </h3>
        </div>
        <Button
          type="button"
          onClick={() => append({ nguoiDaiDien: "", sdt: "", chiNhanh: "", chucVu: "" })}
          className="h-7 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-2xs font-bold flex items-center gap-1.5 border border-slate-200"
        >
          <Plus size={12} /> Thêm đầu mối
        </Button>
      </div>

      {isIndividual && (
        <div className="mx-5 p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-lg flex items-center gap-2 text-2xs text-blue-900">
          <Users size={13} className="text-blue-600 shrink-0" />
          <span className="font-medium">
            Chế độ Cá Nhân: Họ tên & SĐT đầu mối 1 tự động đồng bộ từ Profile. Không cần nhập lại.
          </span>
        </div>
      )}

      <div className="space-y-4 flex-1 pb-4 px-5">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50/50 border border-slate-200/60 transition-all focus-within:border-slate-300 relative group"
          >
            <div className="space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-2xs font-medium uppercase tracking-wide text-slate-500" htmlFor={"contact-name-" + index}>
                  Họ & Tên Người đại diện {index === 0 && <span className="text-red-500">*</span>}
                </label>
                {index === 0 && isIndividual && (
                  <span className="text-3xs font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 inline-flex items-center gap-1">
                    <Check size={9} /> Đồng bộ Profile
                  </span>
                )}
              </div>
              <input
                id={"contact-name-" + index}
                {...register("contacts." + index + ".nguoiDaiDien" as any, {
                  onChange: (e) => {
                    if (index === 0) {
                      setValue("nguoiDaiDien", e.target.value, { shouldDirty: true });
                    }
                  }
                })}
                onBlur={(e) => {
                  const formatted = cleanProperVietnameseText(sanitizeText(e.target.value));
                  setValue("contacts." + index + ".nguoiDaiDien" as any, formatted, { shouldDirty: true });
                  if (index === 0) {
                    setValue("nguoiDaiDien", formatted, { shouldDirty: true, shouldValidate: true });
                  }
                }}
                className="w-full h-8 border border-slate-200 rounded-lg px-3 bg-white text-sm placeholder:text-slate-300"
                placeholder="Nguyễn Văn A..."
              />
              {errors.contacts?.[index]?.nguoiDaiDien && (
                <p className="text-xs text-red-650 mt-1">{errors.contacts?.[index]?.nguoiDaiDien?.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-2xs font-medium uppercase tracking-wide text-slate-500" htmlFor={"contact-phone-" + index}>
                Số điện thoại {index === 0 && <span className="text-red-500">*</span>}
              </label>
              <input
                id={"contact-phone-" + index}
                {...register("contacts." + index + ".sdt" as any, {
                  onChange: (e) => {
                    if (index === 0) {
                      setValue("sdt", e.target.value, { shouldDirty: true, shouldValidate: true });
                    }
                  }
                })}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text');
                  if (text) {
                    e.preventDefault();
                    const clean = sanitizePhoneVN(text);
                    setValue("contacts." + index + ".sdt" as any, clean, { shouldDirty: true });
                    if (index === 0) {
                      setValue("sdt", clean, { shouldDirty: true, shouldValidate: true });
                    }
                  }
                }}
                onBlur={(e) => {
                  const cleaned = sanitizePhoneVN(e.target.value);
                  setValue("contacts." + index + ".sdt" as any, cleaned, { shouldDirty: true });
                  if (index === 0) {
                    setValue("sdt", cleaned, { shouldDirty: true, shouldValidate: true });
                  }
                }}
                className="w-full font-mono h-8 border border-slate-200 rounded-lg px-3 bg-white text-sm placeholder:text-slate-300"
                placeholder="09xx xxx xxx"
              />
              {errors.contacts?.[index]?.sdt && (
                <p className="text-xs text-red-650 mt-1">{errors.contacts?.[index]?.sdt?.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-2xs font-medium uppercase tracking-wide text-slate-500" htmlFor={"contact-chucvu-" + index}>
                Chức vụ / Bộ phận
              </label>
              <input
                id={"contact-chucvu-" + index}
                {...register("contacts." + index + ".chucVu" as any)}
                className="w-full h-8 border border-slate-200 rounded-lg px-3 bg-white text-sm placeholder:text-slate-300"
                placeholder="Ví dụ: Giám đốc, Thu mua..."
              />
            </div>

            <div className="sm:col-span-2 flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200 text-xs mt-1">
              <div className="flex-1 mr-4">
                <span className="text-2xs font-bold text-slate-500 uppercase tracking-wide mb-0.5 block">Chi nhánh / Email / Ghi chú liên lạc</span>
                <input
                  {...register("contacts." + index + ".chiNhanh" as any)}
                  className="w-full text-xs font-medium text-slate-700 placeholder:text-slate-300 border-none px-0 py-0.5 bg-transparent focus:ring-0 focus:outline-none"
                  placeholder="Thêm mô tả liên hệ..."
                />
              </div>
              {index > 0 && (
                <Button
                  type="button"
                  onClick={() => remove(index)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-red-650 hover:bg-red-50 border border-slate-200/80 hover:text-red-700 hover:border-red-200 shrink-0"
                  title="Xóa đầu mối"
                >
                  <Trash size={14} />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
