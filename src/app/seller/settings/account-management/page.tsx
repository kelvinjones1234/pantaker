import { permanentRedirect } from "next/navigation";

/** Legacy path kept as a permanent redirect to the clearer security route. */
export default function LegacyAccountManagementPage() {
  permanentRedirect("/seller/settings/security");
}
