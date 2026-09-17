import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
} from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);
const gridTheme = themeQuartz.withParams({
  accentColor: "#25634d",
  backgroundColor: "#ffffff",
  foregroundColor: "#253a32",
  borderColor: "#e6ebe7",
  headerBackgroundColor: "#f7f9f7",
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 14,
  headerFontSize: 12,
  rowHeight: 57,
  headerHeight: 45,
  wrapperBorderRadius: 8,
});
export default function BusinessGrid(props: any) {
  return <AgGridReact {...props} theme={gridTheme} />;
}
