import type { ParseResult, SetPart } from '@/domain/types'

/**
 * Future adapter hook for Rebrickable / BrickLink XML set lists.
 * v1 uses parseSetListFile / parsePabOrderFile directly.
 */
export interface PartListImporter {
  readonly id: string
  readonly label: string
  canParse: (file: File, text: string) => boolean
  parse: (file: File, text: string) => ParseResult<SetPart[]> | Promise<ParseResult<SetPart[]>>
}
