import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: join(rootDir, '.env') })

type SeedUnit = {
  book_code: string
  unit_number: number
  title: string
  description: string | null
}

type SeedVocabItem = {
  finnish_word: string
  translation: string
  part_of_speech: string | null
  example_sentence: string | null
  notes: string | null
}

type SeedExercise = {
  type: string
  prompt: string
  scene_description: string | null
  correct_answer: unknown
  options: unknown
  source_harjoitus: number | null
  notes: string | null
}

type SeedFile = {
  unit: SeedUnit
  vocab_items: SeedVocabItem[]
  exercises: SeedExercise[]
}

const UNIT_FILES = ['content/unit1_complete.json', 'content/unit2_complete.json']

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

function isUniqueConflict(code: string | undefined, message: string): boolean {
  return code === '23505' || /duplicate key|unique/i.test(message)
}

function readSeedFile(relativePath: string): SeedFile {
  const raw = readFileSync(join(rootDir, relativePath), 'utf8')
  return JSON.parse(raw) as SeedFile
}

function fail(step: string, error: { message?: string } | string): never {
  const message = typeof error === 'string' ? error : (error.message ?? String(error))
  console.error(`ERROR at ${step}: ${message}`)
  process.exit(1)
}

async function seedUnit(
  supabase: ReturnType<typeof createClient>,
  relativePath: string,
): Promise<void> {
  const seed = readSeedFile(relativePath)
  const { unit, vocab_items: vocabItems, exercises } = seed

  console.log(`Seeding Unit ${unit.unit_number} (${unit.title})...`)

  const insertResult = await supabase
    .from('units')
    .insert({
      book_code: unit.book_code,
      unit_number: unit.unit_number,
      title: unit.title,
      description: unit.description,
    })
    .select('id')
    .single()

  let unitId: string

  if (insertResult.error && isUniqueConflict(insertResult.error.code, insertResult.error.message)) {
    const existing = await supabase
      .from('units')
      .select('id')
      .eq('book_code', unit.book_code)
      .eq('unit_number', unit.unit_number)
      .single()

    if (existing.error || !existing.data) {
      fail(`lookup existing unit ${unit.unit_number}`, existing.error ?? 'no row returned')
    }

    unitId = (existing.data as { id: string }).id
    console.log(`Unit already exists, reusing id: ${unitId}`)
    console.log('  (vocab/exercises will still be inserted — re-run may duplicate rows)')
  } else if (insertResult.error) {
    fail(`insert unit ${unit.unit_number}`, insertResult.error)
  } else if (!insertResult.data) {
    fail(`insert unit ${unit.unit_number}`, 'insert returned no id')
  } else {
    unitId = (insertResult.data as { id: string }).id
    console.log(`  → inserted unit id: ${unitId}`)
  }

  const vocabRows = vocabItems.map((item) => ({
    unit_id: unitId,
    finnish_word: item.finnish_word,
    translation: item.translation,
    part_of_speech: item.part_of_speech,
    example_sentence: item.example_sentence,
    notes: item.notes,
  }))

  const vocabResult = await supabase.from('vocab_items').insert(vocabRows)
  if (vocabResult.error) {
    fail(`insert vocab_items for unit ${unit.unit_number}`, vocabResult.error)
  }
  console.log(`  → inserted ${vocabRows.length} vocab items`)

  const exerciseRows = exercises.map((exercise) => ({
    unit_id: unitId,
    type: exercise.type,
    prompt: exercise.prompt,
    scene_description: exercise.scene_description,
    correct_answer: exercise.correct_answer,
    options: exercise.options,
    source_harjoitus: exercise.source_harjoitus,
    authoring_notes: exercise.notes,
  }))

  const exercisesResult = await supabase.from('exercises').insert(exerciseRows)
  if (exercisesResult.error) {
    fail(`insert exercises for unit ${unit.unit_number}`, exercisesResult.error)
  }
  console.log(`  → inserted ${exerciseRows.length} exercises`)
}

async function main(): Promise<void> {
  const url = requireEnv('VITE_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  for (const relativePath of UNIT_FILES) {
    await seedUnit(supabase, relativePath)
  }

  console.log('Done.')
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`ERROR: ${message}`)
  process.exit(1)
})
