package com.spotifywrapped.api.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "plays")
public class Play {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "play_id")
    private Long playId;

    @Column(name = "played_at", nullable = false)
    private LocalDateTime playedAt;

    @Column(name = "ms_played", nullable = false)
    private Integer msPlayed;

    @Column(name = "shuffle")
    private Boolean shuffle;

    @Column(name = "skipped")
    private Boolean skipped;

    @Column(name = "reason_start")
    private String reasonStart;

    @Column(name = "reason_end")
    private String reasonEnd;

    @ManyToOne
    @JoinColumn(name = "track_id")
    private Track track;

    @ManyToOne
    @JoinColumn(name = "session_id")
    private Session session;

    public Play() {
    }

    // Getters y setters
    public Long getPlayId() {
        return playId;
    }

    public void setPlayId(Long playId) {
        this.playId = playId;
    }

    public LocalDateTime getPlayedAt() {
        return playedAt;
    }

    public void setPlayedAt(LocalDateTime playedAt) {
        this.playedAt = playedAt;
    }

    public Integer getMsPlayed() {
        return msPlayed;
    }

    public void setMsPlayed(Integer msPlayed) {
        this.msPlayed = msPlayed;
    }

    public Boolean getShuffle() {
        return shuffle;
    }

    public void setShuffle(Boolean shuffle) {
        this.shuffle = shuffle;
    }

    public Boolean getSkipped() {
        return skipped;
    }

    public void setSkipped(Boolean skipped) {
        this.skipped = skipped;
    }

    public String getReasonStart() {
        return reasonStart;
    }

    public void setReasonStart(String reasonStart) {
        this.reasonStart = reasonStart;
    }

    public String getReasonEnd() {
        return reasonEnd;
    }

    public void setReasonEnd(String reasonEnd) {
        this.reasonEnd = reasonEnd;
    }

    public Track getTrack() {
        return track;
    }

    public void setTrack(Track track) {
        this.track = track;
    }

    public Session getSession() {
        return session;
    }

    public void setSession(Session session) {
        this.session = session;
    }
}