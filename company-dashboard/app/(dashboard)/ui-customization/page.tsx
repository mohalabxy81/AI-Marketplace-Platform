import { CustomizationShell } from "@/features/branding";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "UI Customization | Company Dashboard",
  description: "Customize the look and feel of your workspace",
};

export default function UICustomizationPage() {
  return (
    <div className="h-full w-full p-4 md:p-6 lg:p-8">
      <CustomizationShell />
    </div>
  );
}
