import BrandItemAdminPage from "@/components/admin/BrandItemAdminPage";

export default function BladesPage() {
  return (
    <BrandItemAdminPage
      apiPath="/api/admin/blade-brands"
      title="Blade Brands"
      itemLabel="Blade Names"
    />
  );
}
