/**
 * Systeme.io API Client
 * Handles contacts, tags, and automation triggers for email list building.
 */

const BASE_URL = "https://api.systeme.io/api";
const API_KEY = process.env.SYSTEMEIO_API_KEY || "";

function headers() {
  return {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json",
  };
}

async function api(method: string, path: string, body?: any): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Systeme.io ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

// ═══════════════════════════════════════
//  Contacts
// ═══════════════════════════════════════

export interface Contact {
  id?: number;
  email: string;
  firstName?: string;
  lastName?: string;
  fields?: { slug: string; value: string }[];
  tags?: { name: string }[];
}

/** Create a new contact (subscriber) */
export async function createContact(contact: Contact): Promise<any> {
  return api("POST", "/contacts", contact);
}

/** Get contact by ID */
export async function getContact(id: number): Promise<any> {
  return api("GET", `/contacts/${id}`);
}

/** Search contacts by email */
export async function findContactByEmail(email: string): Promise<any> {
  const data = await api("GET", `/contacts?email=${encodeURIComponent(email)}`);
  return data?.items?.[0] || null;
}

/** Update a contact */
export async function updateContact(id: number, updates: Partial<Contact>): Promise<any> {
  return api("PATCH", `/contacts/${id}`, updates);
}

/** Delete a contact */
export async function deleteContact(id: number): Promise<any> {
  return api("DELETE", `/contacts/${id}`);
}

/** List contacts with pagination */
export async function listContacts(page = 1, limit = 10): Promise<any> {
  return api("GET", `/contacts?page=${page}&limit=${limit}`);
}

// ═══════════════════════════════════════
//  Tags
// ═══════════════════════════════════════

/** List all tags */
export async function listTags(): Promise<any> {
  return api("GET", "/tags");
}

/** Create a tag */
export async function createTag(name: string): Promise<any> {
  return api("POST", "/tags", { name });
}

/** Add a tag to a contact (triggers automation rules in Systeme.io) */
export async function addTagToContact(contactId: number, tagId: number): Promise<any> {
  return api("POST", `/contacts/${contactId}/tags`, { tagId });
}

/** Remove a tag from a contact */
export async function removeTagFromContact(contactId: number, tagId: number): Promise<any> {
  return api("DELETE", `/contacts/${contactId}/tags/${tagId}`);
}

// ═══════════════════════════════════════
//  Batch Operations
// ═══════════════════════════════════════

/** Add multiple contacts at once with a tag */
export async function batchAddContacts(
  contacts: { email: string; firstName?: string }[],
  tagName?: string
): Promise<{ added: number; failed: number; errors: string[] }> {
  let tagId: number | undefined;

  // Find or create tag
  if (tagName) {
    const tags = await listTags();
    const existing = tags?.items?.find((t: any) => t.name === tagName);
    if (existing) {
      tagId = existing.id;
    } else {
      const newTag = await createTag(tagName);
      tagId = newTag.id;
    }
  }

  let added = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const c of contacts) {
    try {
      // Check if exists first
      const existing = await findContactByEmail(c.email);
      let contactId: number;

      if (existing) {
        contactId = existing.id;
        // Update name if provided
        if (c.firstName) {
          await updateContact(contactId, { firstName: c.firstName });
        }
      } else {
        const created = await createContact({
          email: c.email,
          firstName: c.firstName,
        });
        contactId = created.id;
      }

      // Apply tag (triggers automation)
      if (tagId) {
        await addTagToContact(contactId, tagId);
      }

      added++;
    } catch (e: any) {
      failed++;
      errors.push(`${c.email}: ${e.message}`);
    }
  }

  return { added, failed, errors };
}

/** Get total contact count */
export async function getContactCount(): Promise<number> {
  const data = await listContacts(1, 10);
  return data?.totalCount || 0;
}
