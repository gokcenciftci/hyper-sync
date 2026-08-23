import { describe, it, expect } from "vitest";
import { CRDTDoc } from "../../src/crdt/doc.js";

describe("CRDTDoc Comprehensive Operations", () => {
  it("should handle text insertions and deletions", () => {
    const doc = new CRDTDoc("doc-1", "peer-1");
    doc.insertText("body", 0, "Hello World");
    expect(doc.getText("body").toString()).toBe("Hello World");

    doc.deleteText("body", 5, 6);
    expect(doc.getText("body").toString()).toBe("Hello");
  });

  it("should handle set additions and removals", () => {
    const doc = new CRDTDoc("doc-1", "peer-1");
    doc.addToSet("tags", "alpha");
    doc.addToSet("tags", "beta");

    expect(doc.getSet("tags").has("alpha")).toBe(true);
    expect(doc.getSet("tags").has("beta")).toBe(true);

    doc.removeFromSet("tags", "alpha");
    expect(doc.getSet("tags").has("alpha")).toBe(false);
    expect(doc.getSet("tags").has("beta")).toBe(true);
  });

  it("should export full JSON with registers, sets, and sequences", () => {
    const doc = new CRDTDoc("doc-1", "peer-1");
    doc.set("title", "My Doc");
    doc.addToSet("categories", "tech");
    doc.insertText("summary", 0, "Brief summary");

    const json = doc.toJSON();
    expect(json["title"]).toBe("My Doc");
    expect(json["categories"]).toEqual(["tech"]);
    expect(json["summary"]).toBe("Brief summary");
  });
});
