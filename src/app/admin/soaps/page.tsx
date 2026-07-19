import BrandItemAdminPage from "@/components/admin/BrandItemAdminPage";

export default function SoapsPage() {
  return (
    <BrandItemAdminPage
      apiPath="/api/admin/soap-brands"
      title="Shave Soap Brands"
      itemLabel="Scents / Products"
    />
  );
}
