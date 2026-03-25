package com.cronos.formflow_api.domain.form;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.Type;

import com.cronos.formflow_api.config.JsonNodeType;
import com.cronos.formflow_api.domain.user.User;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tools.jackson.databind.JsonNode;

@Entity
@Table(name = "forms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Form {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private FormStatus status = FormStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private FormLayout layout = FormLayout.MULTI_STEP;
    
    @Column
    private String welcomeMessage;

    @Column
    private String thankYouMessage;

    @Column(name = "thank_you_redirect_url", length = 2048)
    private String thankYouRedirectUrl;

    @Column(name = "thank_you_redirect_delay")
    private Integer thankYouRedirectDelay;

    @Column(name = "thank_you_show_resubmit", nullable = false)
    @Builder.Default
    private Boolean thankYouShowResubmit = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private FormVisibility visibility = FormVisibility.PUBLIC;

    @Column(unique = true)
    private String slug;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "max_responses")
    private Integer maxResponses;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Type(JsonNodeType.class)
    @Column(columnDefinition = "jsonb")
    private JsonNode draftSchema;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "form", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("version")
    @Builder.Default
    private List<FormVersion> versions = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
