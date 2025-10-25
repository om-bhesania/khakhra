export const exportToCsv = (data: any[], headers: string[], filename: string) => {
  const csvData = [headers.map((header) => `"${header}"`).join(",")]
    .concat(
      data.map((row) => headers.map((header) => `"${row[header]}"`).join(","))
    )
    .join("\n");

  const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename || "data.csv");
  link.click();
};
