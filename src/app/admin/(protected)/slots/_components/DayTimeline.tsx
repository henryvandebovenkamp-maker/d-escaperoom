// pseudo: getDayIndicators(slots)
type Slot = { status: string }; // Adjust type as needed

// Example: receive slots as a prop or argument
const slots: Slot[] = []; // Replace with actual data source

const orange = slots.filter(s => s.status === "DRAFT").length;      // baseline 13 - published - booked
const green  = slots.filter(s => s.status === "PUBLISHED").length;
const purple = slots.filter(s => s.status === "BOOKED").length;
