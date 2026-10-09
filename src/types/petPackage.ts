export interface PetManifest {
  id: string;
  displayName: string;
  description?: string;
  spriteVersionNumber?: number;
  spritesheetPath: string;
}

export interface PetPackageSummary {
  id: string;
  displayName: string;
  description: string;
  spriteVersionNumber: number;
}

export interface ActivePetPackage {
  manifest: PetManifest;
  spritesheetDataUrl: string;
}
