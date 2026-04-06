import { getProducts } from "./actions";
import { ProductsClient } from "./products-client";

export default async function ProductsPage() {
  const { data } = await getProducts();
  return <ProductsClient initialProducts={data} />;
}
