package com.easytennis.entity;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Player {

    private String name;

    // Nullable link back to the roster PlayerProfile this snapshot was created from.
    // Null for ad-hoc/legacy players that have no roster entry (orphans).
    private Long profileId;
}
