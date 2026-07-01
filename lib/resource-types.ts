export type ResourceKind = "file" | "url";

export type ResourceFileType = "pdf" | "image" | "other" | "url";

export type ResourceItem = {
  id: string;
  kind: ResourceKind;
  fileType: ResourceFileType;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  tagsEn: string[];
  tagsAr: string[];
  url: string;
  storedPath: string;
  originalName: string;
  createdAt: string;
  updatedAt: string;
};

export type ResourceCreatePayload = {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  tagsEn: string[];
  tagsAr: string[];
};

export type ResourceUpdatePayload = Partial<
  Pick<
    ResourceItem,
    | "titleEn"
    | "titleAr"
    | "descriptionEn"
    | "descriptionAr"
    | "tagsEn"
    | "tagsAr"
  >
>;
