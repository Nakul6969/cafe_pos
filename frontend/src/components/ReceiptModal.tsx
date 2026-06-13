import React, { useRef, useState } from "react";
import { Order, Customer, Table } from "../types";
import { Printer, Download, Mail, Share2, Check, X, FileText } from "lucide-react";
import BrandLogo from "./common/BrandLogo";

interface ReceiptModalProps {
  order: Order | null;
  customer: Customer | null;
  table: Table | null;
  onClose: () => void;
}

export default function ReceiptModal({ order, customer, table, onClose }: ReceiptModalProps) {
  const [emailSent, setEmailSent] = useState(false);
  const [whatsappShared, setWhatsappShared] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const formattedDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Calculate distinct items taxes
  const totalTaxRate = order.items.reduce((acc, itm) => acc + (itm.tax / 100) * itm.lineTotal, 0);

  // Dynamic UPI payment QR generation URL
  const upiVpa = "Cafe POS@ybl";
  const upiAmount = order.total.toFixed(2);
  const upiestr = `upi://pay?pa=${upiVpa}&pn=Cafe POS%20POS&am=${upiAmount}&cu=INR&tn=Order%20${order.orderNumber}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiestr)}`;

  // Simulated PDF download
  const handleDownloadPDF = () => {
    const lines: string[] = [];
    const width = 45;

    const center = (str: string, w: number = width) => {
      const pad = Math.max(0, w - str.length);
      const left = Math.floor(pad / 2);
      return " ".repeat(left) + str;
    };

    const leftRight = (left: string, right: string, w: number = width) => {
      const space = Math.max(1, w - left.length - right.length);
      return left + " ".repeat(space) + right;
    };

    const separator = (char: string = "-", w: number = width) => char.repeat(w);

    // 1. Build Receipt Content Text Programmatically (Fixed-Width Formatting)
    lines.push(center("CAFE ODOO"));
    lines.push(center("12, Green Park Avenue, Delhi"));
    lines.push(center("Tel: +91 99882 11000"));
    lines.push("");

    lines.push(separator("-"));
    lines.push(leftRight(`Order: ${order.orderNumber}`, `Date: ${formattedDate || ""}`));
    if (table) {
      lines.push(leftRight(`Table: ${table.tableNumber} (${table.seats} seats)`, "Floor: Lobby"));
    }
    if (customer) {
      const buyerName = customer.name.length > 18 ? customer.name.substring(0, 15) + "..." : customer.name;
      const buyerPhone = customer.phone.length > 15 ? customer.phone.substring(0, 12) + "..." : customer.phone;
      lines.push(leftRight(`Buyer: ${buyerName}`, `Phone: ${buyerPhone}`));
    }
    lines.push(separator("-"));

    // Unified row formatter for perfect alignment (Item: 20, Qty: 4, Price: 9, Total: 9)
    const formatRow = (col1: string, col2: string, col3: string, col4: string) => {
      const c1 = col1.length > 20 ? col1.substring(0, 17) + "..." : col1.padEnd(20, " ");
      const c2 = col2.padStart(4, " ");
      const c3 = col3.padStart(9, " ");
      const c4 = col4.padStart(9, " ");
      return `${c1} ${c2} ${c3} ${c4}`;
    };

    lines.push(formatRow("Item", "Qty", "Price", "Total"));
    lines.push(separator("-"));

    for (const itm of order.items) {
      lines.push(formatRow(
        itm.productName,
        itm.quantity.toString(),
        `Rs.${itm.price.toFixed(2)}`,
        `Rs.${itm.lineTotal.toFixed(2)}`
      ));
      if (itm.notes) {
        lines.push(`  -> ${itm.notes}`);
      }
    }
    lines.push(separator("-"));

    lines.push(leftRight("Subtotal:", `Rs.${order.subtotal.toFixed(2)}`));
    if (order.discount > 0) {
      lines.push(leftRight("Discount:", `-Rs.${order.discount.toFixed(2)}`));
    }
    lines.push(leftRight("CGST & SGST:", `Rs.${order.tax.toFixed(2)}`));
    lines.push(separator("-"));
    lines.push(leftRight("TOTAL AMOUNT:", `Rs.${order.total.toFixed(2)}`));
    lines.push(separator("-"));

    lines.push("");
    lines.push(center(`Payment Method: ${order.paymentMethod || "CASH"}`));
    lines.push("");
    lines.push(center("*** THANK YOU FOR DINING ***"));
    lines.push("");
    lines.push(center("Powered by Cafe Odoo"));

    const encoder = new TextEncoder();

    // Calculate dynamic page height based on lines
    const pageHeight = lines.length * 14 + 60;

    // Escape parentheses and backslashes for the PDF stream format.
    // Set text start position at x=15 (to center 270pt width Courier text on 300pt page) and y=pageHeight-30.
    let streamContent = `BT\n/F1 10 Tf\n14 TL\n15 ${pageHeight - 30} Td\n`;
    for (const line of lines) {
      const cleanLine = line.replace(/[\u20B9₹]/g, "Rs. ");
      const escapedLine = cleanLine.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
      streamContent += `(${escapedLine}) Tj T*\n`;
    }
    streamContent += "ET";

    const streamBytes = encoder.encode(streamContent);
    const streamLength = streamBytes.length;

    // Define PDF objects as strings (MediaBox set to width=300 and height=pageHeight)
    const headerStr = "%PDF-1.4\n";
    const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
    const obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
    const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 300 ${pageHeight}] /Contents 5 0 R >>\nendobj\n`;
    const obj4 = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n";
    const obj5Part1 = `5 0 obj\n<< /Length ${streamLength} >>\nstream\n`;
    const obj5Part2 = "\nendstream\nendobj\n";

    // Encode strings to bytes to get precise byte offsets
    const headerBytes = encoder.encode(headerStr);
    const b1 = encoder.encode(obj1);
    const b2 = encoder.encode(obj2);
    const b3 = encoder.encode(obj3);
    const b4 = encoder.encode(obj4);
    const b5P1 = encoder.encode(obj5Part1);
    const b5P2 = encoder.encode(obj5Part2);

    const offsets: number[] = [];
    let currentOffset = headerBytes.length;

    offsets.push(currentOffset);
    currentOffset += b1.length;

    offsets.push(currentOffset);
    currentOffset += b2.length;

    offsets.push(currentOffset);
    currentOffset += b3.length;

    offsets.push(currentOffset);
    currentOffset += b4.length;

    offsets.push(currentOffset);
    currentOffset += b5P1.length + streamBytes.length + b5P2.length;

    const startXref = currentOffset;

    // Build cross-reference table and trailer using exact offsets
    let xrefStr = `xref\n0 6\n0000000000 65535 f \n`;
    for (let i = 0; i < offsets.length; i++) {
      xrefStr += `${offsets[i].toString().padStart(10, "0")} 00000 n \n`;
    }
    xrefStr += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
    const xrefBytes = encoder.encode(xrefStr);

    // Concatenate all bytes into one buffer
    const totalLength = headerBytes.length + b1.length + b2.length + b3.length + b4.length + b5P1.length + streamBytes.length + b5P2.length + xrefBytes.length;
    const pdfBytes = new Uint8Array(totalLength);

    let pos = 0;
    pdfBytes.set(headerBytes, pos); pos += headerBytes.length;
    pdfBytes.set(b1, pos); pos += b1.length;
    pdfBytes.set(b2, pos); pos += b2.length;
    pdfBytes.set(b3, pos); pos += b3.length;
    pdfBytes.set(b4, pos); pos += b4.length;
    pdfBytes.set(b5P1, pos); pos += b5P1.length;
    pdfBytes.set(streamBytes, pos); pos += streamBytes.length;
    pdfBytes.set(b5P2, pos); pos += b5P2.length;
    pdfBytes.set(xrefBytes, pos); pos += xrefBytes.length;

    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Receipt_${order.orderNumber}.pdf`;
    link.click();
  };

  // Printing style handler
  const handlePrint = () => {
    const printContent = receiptRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;
    
    // Simple popup window or styling replacement to print beautifully
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt ${order.orderNumber}</title>
            <style>
              body { font-family: 'Courier New', Courier, monospace; padding: 20px; line-height: 1.4; color: #111; max-width: 320px; margin: 0 auto; }
              .center { text-align: center; }
              .dashed { border-top: 1px dashed #000; margin: 10px 0; }
              .flex { display: flex; justify-content: space-between; }
            </style>
          </head>
          <body>
            ${printContent}
            <script>window.onload = function() { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  const handleSendEmail = () => {
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 3000);
  };

  const handleWhatsappShare = () => {
    setWhatsappShared(true);
    setTimeout(() => setWhatsappShared(false), 3000);
    // Open standard whatsapp text link
    const text = `Thanks for dining at Cafe POS! Your receipts for Order ${order.orderNumber} is ready. Total: ₹${order.total.toFixed(2)}. Have an awesome day!`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs font-sans">
      <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:flex-row max-h-[90vh]">
        
        {/* Left Side: Receipt Actions Dashboard */}
        <div className="flex flex-col justify-between border-b border-gray-100 bg-gray-50/50 p-6 md:w-5/12 md:border-b-0 md:border-r">
          <div>
            <h3 className="font-display text-xl font-bold text-gray-900">Paid Receipt</h3>
            <p className="mt-1 text-sm text-gray-500">Order successfully recorded. Actions available for customers.</p>
            
            <div className="mt-6 space-y-3">
              <button
                id="btn-print-receipt"
                onClick={handlePrint}
                className="flex w-full items-center gap-3 rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-purple-700"
              >
                <Printer className="h-4 w-4" />
                Print Cashier Ticket
              </button>
              
              <button
                id="btn-download-pdf"
                onClick={handleDownloadPDF}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-4 w-4 text-purple-500" />
                Download PDF Receipt
              </button>

              <button
                id="btn-email-receipt"
                onClick={handleSendEmail}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-purple-500" />
                  Email Receipt to Customer
                </div>
                {emailSent && <span className="flex items-center gap-1 text-xs text-green-600"><Check className="h-3 w-3" /> Sent</span>}
              </button>

              <button
                id="btn-whatsapp-receipt"
                onClick={handleWhatsappShare}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <Share2 className="h-4 w-4 text-emerald-500" />
                  Share via WhatsApp
                </div>
                {whatsappShared && <span className="text-xs text-green-600">Opened</span>}
              </button>
            </div>
          </div>

          <div className="mt-8 rounded-xl bg-purple-50 p-4">
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-800">
              <span className="h-2 w-2 rounded-full bg-purple-500 pulsing-ring" />
              Dynamic UPI Payment Code
            </h4>
            <p className="mt-1 text-xs text-purple-600">Unified Payments Interface sandbox mode. Dynamic instant amount matching.</p>
            <div className="mt-3 flex justify-center bg-white p-2 rounded-lg border border-purple-100 max-w-[170px] mx-auto">
              <img src={qrCodeUrl} alt="UPI QR" className="h-36 w-36 object-contain" referrerPolicy="no-referrer" />
            </div>
            <div className="mt-2 text-center text-[10px] font-mono text-purple-600 font-medium">VPA: {upiVpa}</div>
          </div>
        </div>

        {/* Right Side: Scrollable Receipt Render */}
        <div className="flex flex-1 flex-col overflow-hidden bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2 text-gray-400">
              <FileText className="h-5 w-5 text-gray-400" />
              <span className="font-mono text-xs">{order.orderNumber}</span>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-10 py-8">
            {/* Printable Receipt Area */}
            <div
              ref={receiptRef}
              className="mx-auto max-w-sm rounded-lg border border-gray-100 bg-neutral-50 px-6 py-8 outline-dashed outline-1 outline-offset-4 outline-neutral-200"
              style={{ fontFamily: "'Courier New', Courier, monospace" }}
            >
              <div className="text-center">
                <BrandLogo size="md" className="mx-auto mb-2" />
                <h1 className="text-xl font-bold uppercase tracking-widest text-neutral-800">CAFE ODOO</h1>
                <p className="text-[11px] text-neutral-500">12, Green Park Avenue, Delhi</p>
                <p className="text-[11px] text-neutral-500">Tel: +91 99882 11000</p>
              </div>

              <div className="mt-6 border-b border-dashed border-neutral-300 pb-2 text-xs text-neutral-600">
                <div className="flex justify-between">
                  <span>Order: {order.orderNumber}</span>
                  <span>Date: {formattedDate}</span>
                </div>
                {table && (
                  <div className="flex justify-between">
                    <span>Table: {table.tableNumber} ({table.seats} seats)</span>
                    <span>Floor: Lobby</span>
                  </div>
                )}
                {customer && (
                  <div className="mt-1 flex justify-between">
                    <span>Buyer: {customer.name}</span>
                    <span>Phone: {customer.phone}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="mt-4 text-xs">
                <div className="flex border-b border-neutral-200 pb-1 font-bold text-neutral-700 text-right">
                  <span className="flex-1 text-left">Item</span>
                  <span className="w-12">Qty</span>
                  <span className="w-20">Price</span>
                  <span className="w-20">Total</span>
                </div>

                <div className="space-y-2 mt-2">
                  {order.items.map((itm, i) => (
                    <div key={i} className="flex text-right text-neutral-600">
                      <span className="flex-1 text-left truncate">{itm.productName}</span>
                      <span className="w-12">{itm.quantity}</span>
                      <span className="w-20">₹{itm.price.toFixed(2)}</span>
                      <span className="w-20 font-bold">₹{itm.lineTotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dashed my-4 border-t border-dashed border-neutral-300" />

              {/* Calculations */}
              <div className="space-y-1.5 text-xs text-neutral-600 text-right">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{order.subtotal.toFixed(2)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>Discount:</span>
                    <span>-₹{order.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>CGST & SGST:</span>
                  <span>₹{order.tax.toFixed(2)}</span>
                </div>
                <div className="dashed my-4 border-t border-dashed border-neutral-300" />
                <div className="flex justify-between text-sm font-bold text-neutral-800">
                  <span>TOTAL AMOUNT:</span>
                  <span>₹{order.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="dashed my-4 border-t border-dashed border-neutral-300" />

              {/* Payment Details */}
              <div className="text-center text-[10px] text-neutral-500">
                <p>Payment Method: <span className="font-bold uppercase text-neutral-700">{order.paymentMethod || "UPI"}</span></p>
                <p className="mt-4">*** THANK YOU FOR DINING ***</p>
                <p>Powered by Cafe Odoo</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
