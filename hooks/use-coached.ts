"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchCoachedProducts,
  coachedOrgsFromProducts,
  fetchCoachedCourseDetails,
  fetchLessonProgress,
  markLessonComplete as markLessonCompleteService,
  type CoachedOrg,
  type CoachedProduct,
  type CoachedCourseDetails,
} from "@/lib/services/coached"

export function useCoached() {
  const { supabase, user } = useAuth()
  const userId = user?.id ?? null

  const query = useQuery({
    queryKey: ["coached", userId],
    queryFn: () => {
      if (!userId) {
        throw new Error("Cannot fetch coached products without a user id")
      }
      return fetchCoachedProducts(supabase, userId)
    },
    enabled: !!userId,
  })

  const products = (query.data ?? []) as CoachedProduct[]
  const orgs = coachedOrgsFromProducts(products)

  return {
    coachedOrgs: orgs,
    coachedProducts: products,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useCoachedCourse(productId: number | null, slug: string | null) {
  const { supabase, user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id ?? null

  const courseQuery = useQuery({
    queryKey: ["coached-course", userId, productId],
    queryFn: () => {
      if (!userId || !productId) {
        throw new Error("Cannot fetch coached course without user id and product id")
      }
      return fetchCoachedCourseDetails(supabase, userId, productId)
    },
    enabled: !!userId && !!productId,
  })

  const enrollmentProductId = courseQuery.data?.enrollment_product_id ?? null

  const progressQuery = useQuery({
    queryKey: ["coached-course-progress", userId, enrollmentProductId],
    queryFn: () => {
      if (!userId || enrollmentProductId == null) {
        throw new Error(
          "Cannot fetch coached course progress without user id and enrollment product id"
        )
      }
      return fetchLessonProgress(supabase, userId, enrollmentProductId)
    },
    enabled: !!userId && enrollmentProductId != null,
  })

  const markCompleteMutation = useMutation({
    mutationFn: (productModuleItemId: number) => {
      if (!userId || enrollmentProductId == null) {
        throw new Error(
          "Cannot mark lesson complete without user id and enrollment product id"
        )
      }
      return markLessonCompleteService(
        supabase,
        userId,
        enrollmentProductId,
        productModuleItemId
      )
    },
    onSuccess: (_, productModuleItemId) => {
      queryClient.setQueryData<Set<number>>(
        ["coached-course-progress", userId, enrollmentProductId],
        (prev) => (prev ? new Set([...prev, productModuleItemId]) : new Set([productModuleItemId]))
      )
    },
  })

  const course = courseQuery.data ?? null
  const progress = progressQuery.data ?? new Set<number>()
  const isLoading = courseQuery.isLoading || progressQuery.isLoading
  const error = courseQuery.error ?? progressQuery.error

  const slugMatches = slug != null && course != null && course.organization_slug === slug

  const markComplete = (productModuleItemId: number) => {
    if (enrollmentProductId == null) return
    markCompleteMutation.mutate(productModuleItemId)
  }

  return {
    course,
    progress,
    isLoading,
    error,
    slugMatches,
    markComplete,
    markCompletePending: markCompleteMutation.isPending,
    refetch: () => {
      courseQuery.refetch()
      progressQuery.refetch()
    },
  }
}

export type { CoachedOrg, CoachedProduct, CoachedCourseDetails }
