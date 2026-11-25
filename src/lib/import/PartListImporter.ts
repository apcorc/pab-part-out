import type { ParseResult, SetPart } from '@/domain/types'

/**
 * Adapter hook for additional set-list formats.
 * CSV, JSON, and BrickLink XML/CSV are parsed by parseSetListFile.
 */
export interface PartListImporter {
  readonly id: string
  readonly label: string
  canParse: (file: File, text: string) => boolean
  parse: (file: File, text: string) => ParseResult<SetPart[]> | Promise<ParseResult<SetPart[]>>
}
