import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  setupAgTestIds,
  AllCommunityModule,
  themeQuartz,
} from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);
// Expose AG Grid row, cell, header and filter locators in every environment.
setupAgTestIds({ testIdAttribute: "data-testid" });
const gridTheme = themeQuartz.withParams({
  accentColor: "#25634d",
  backgroundColor: "#ffffff",
  foregroundColor: "#253a32",
  borderColor: "#e6ebe7",
  headerBackgroundColor: "#edf3ec",
  fontFamily: "DM Sans, system-ui, sans-serif",
  fontSize: 14,
  headerFontSize: 12,
  rowHeight: 57,
  headerHeight: 45,
  wrapperBorderRadius: 12,
});
export default function BusinessGrid(props: any) {
  return <AgGridReact {...props} theme={gridTheme} />;
}
