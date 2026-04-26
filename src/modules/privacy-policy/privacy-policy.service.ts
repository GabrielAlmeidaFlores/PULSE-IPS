import {
  findActivePrivacyPolicyVersion,
  findAllPrivacyPolicyVersions,
  findPrivacyPolicyVersionById,
  createPrivacyPolicyVersion,
} from "@/modules/privacy-policy/privacy-policy.repository"
import type { CreatePrivacyPolicyVersionInput } from "@/modules/privacy-policy/privacy-policy.types"

export function getActivePrivacyPolicyVersion(): ReturnType<typeof findActivePrivacyPolicyVersion> {
  return findActivePrivacyPolicyVersion()
}

export function getAllPrivacyPolicyVersions(): ReturnType<typeof findAllPrivacyPolicyVersions> {
  return findAllPrivacyPolicyVersions()
}

export function getPrivacyPolicyVersionById(
  id: string,
): ReturnType<typeof findPrivacyPolicyVersionById> {
  return findPrivacyPolicyVersionById(id)
}

export function createNewPrivacyPolicyVersion(
  input: CreatePrivacyPolicyVersionInput,
): ReturnType<typeof createPrivacyPolicyVersion> {
  return createPrivacyPolicyVersion(input)
}
